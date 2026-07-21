/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.utils.files.sample

import java.io._
import java.util.zip.{GZIPInputStream, GZIPOutputStream}

import scala.collection.mutable
import scala.io.{Codec, Source}

/** Normalises an uploaded repertoire into the VDJtools table that vdjtools' `BaseParser` expects, so
  * the rest of the annotate pipeline stays untouched.
  *
  * vdjtools ships parsers for 12 formats but none of them read AIRR, and its "VDJtools" reader is
  * strictly positional — a plain `v/j/cdr3aa` table is not loadable at all. Rather than write four
  * parsers, this reads a header, resolves each logical field through a table of accepted aliases, and
  * emits one canonical layout. Adding a format is then usually just another alias.
  *
  * Output columns (tab separated, one header line), exactly as `BaseParser` indexes them:
  * {{{count freq cdr3nt cdr3aa v d j VEnd DStart DEnd JStart}}}
  */
object SampleConverter {

  /** vdjtools' positional VDJtools layout — the single output shape. */
  private final val OutputHeader = "count\tfreq\tcdr3nt\tcdr3aa\tv\td\tj\tVEnd\tDStart\tDEnd\tJStart"

  /** Segment markup is not reconstructible from AIRR/MiXCR/plain input; `BaseParser` reads -1 as
    * "absent" and only `ZERO_COUNT`/`ZERO_FREQ`/`NO_CDR3NT`/`NO_CDR3AA` cause a row to be dropped. */
  private final val NoSegmentMarkup = "-1\t-1\t-1\t-1"

  // ---------------------------------------------------------------------------------------------
  // Header aliases. Lower-cased, punctuation-stripped; see `normaliseHeader`.
  // ---------------------------------------------------------------------------------------------

  private final val CountAliases   = Seq("count", "duplicatecount", "consensuscount", "clonecount", "reads", "readcount")
  private final val FreqAliases    = Seq("freq", "frequency", "clonefraction", "readfraction")
  /** Junction convention (conserved C…F/W included) — directly usable as VDJtools `cdr3aa`. */
  private final val JunctionAaAliases = Seq("cdr3aa", "junctionaa", "aaseqcdr3", "cdr3amino", "cdr3aminoacid")
  /** IMGT CDR3 convention (anchors STRIPPED) — needs anchors re-added before use. */
  private final val ImgtCdr3AaAliases = Seq("cdr3aaimgt", "imgtcdr3aa")
  private final val JunctionNtAliases = Seq("cdr3nt", "junction", "nseqcdr3", "cdr3nucleotide")
  private final val VAliases       = Seq("v", "vcall", "vsegm", "vgene", "allvhitswithscore", "bestvhit", "vhit", "vhits")
  private final val DAliases       = Seq("d", "dcall", "dsegm", "dgene", "alldhitswithscore", "bestdhit", "dhit", "dhits")
  private final val JAliases       = Seq("j", "jcall", "jsegm", "jgene", "alljhitswithscore", "bestjhit", "jhit", "jhits")
  private final val LocusAliases   = Seq("locus", "chain", "receptor")
  private final val ProductiveAliases = Seq("productive")

  /** `cdr3_aa` is ambiguous across the wild: AIRR defines it as IMGT CDR3 (anchors stripped) while
    * several exporters use it for the junction. Resolved contextually in [[resolve]]. */
  private final val AmbiguousCdr3Aa = "cdr3aa"

  final case class Columns(count: Option[Int], freq: Option[Int], junctionAa: Option[Int],
                           imgtCdr3Aa: Option[Int], junctionNt: Option[Int], v: Option[Int],
                           d: Option[Int], j: Option[Int], locus: Option[Int], productive: Option[Int]) {
    /** The AA column is the one thing we cannot proceed without. */
    def aaColumn: Option[Int] = junctionAa.orElse(imgtCdr3Aa)
    def usesImgtCdr3: Boolean = junctionAa.isEmpty && imgtCdr3Aa.isDefined
  }

  final case class ChainOutput(chain: String, file: File, clonotypes: Long)

  final case class Report(format: String, chains: Seq[ChainOutput], readRows: Long, skippedRows: Long,
                          warnings: Seq[String])

  class ConversionException(message: String) extends RuntimeException(message)

  // ---------------------------------------------------------------------------------------------

  private def normaliseHeader(name: String): String =
    name.trim.toLowerCase.replaceAll("[^a-z0-9]", "")

  /** AIRR names `cdr3_aa` for IMGT CDR3 and `junction_aa` for the junction. Both normalise to
    * distinct keys except `cdr3aa`, which is also the VDJtools junction column — so treat a bare
    * `cdr3aa` as the junction UNLESS the file also has `junction_aa` (then it is genuinely IMGT). */
  private[sample] def resolve(header: Seq[String]): Columns = {
    val idx = header.map(normaliseHeader).zipWithIndex.toMap
    def find(aliases: Seq[String]): Option[Int] = aliases.collectFirst { case a if idx.contains(a) => idx(a) }

    val explicitJunctionAa = idx.get("junctionaa")
    val bareCdr3Aa         = idx.get(AmbiguousCdr3Aa)

    val (junctionAa, imgtCdr3Aa) = (explicitJunctionAa, bareCdr3Aa) match {
      // Both present => AIRR semantics: junction_aa is the junction, cdr3_aa is IMGT. Prefer junction.
      case (Some(j), Some(_)) => (Some(j), None)
      case (Some(j), None)    => (Some(j), None)
      case (None, Some(c))    => (Some(c), None) // bare cdr3aa: treat as junction, verified per-row
      case (None, None)       => (find(JunctionAaAliases), find(ImgtCdr3AaAliases))
    }

    Columns(
      count      = find(CountAliases),
      freq       = find(FreqAliases),
      junctionAa = junctionAa.orElse(find(JunctionAaAliases)),
      imgtCdr3Aa = imgtCdr3Aa.orElse(find(ImgtCdr3AaAliases)),
      junctionNt = find(JunctionNtAliases),
      v          = find(VAliases),
      d          = find(DAliases),
      j          = find(JAliases),
      locus      = find(LocusAliases),
      productive = find(ProductiveAliases)
    )
  }

  /** Best-effort format label, for the UI and for error messages. */
  private[sample] def detectFormat(header: Seq[String]): String = {
    val h = header.map(normaliseHeader).toSet
    if (h.contains("vcall") || h.contains("junctionaa")) "AIRR"
    else if (h.exists(_.contains("hitswithscore")) || h.contains("aaseqcdr3")) "MiXCR"
    else if (h.contains("cdr3nt") && h.contains("freq") && h.contains("count")) "VDJtools"
    else "plain"
  }

  /** Strip a segment call down to an IMGT gene name.
    *
    * Handles MiXCR's `TRBV7-9*00(1234.5)`, AIRR's comma-separated ties (`TRBV7-9*01,TRBV7-8*01`) and
    * plain `TRBV7-9`. The allele suffix is dropped because VDJdb matches at gene level; keeping `*01`
    * would simply fail to match records recorded without it.
    */
  private[sample] def cleanSegment(raw: String): String = {
    val first = raw.trim.split("[,;]").headOption.getOrElse("").trim
    val noScore = first.takeWhile(_ != '(').trim
    val noAllele = noScore.split('*').headOption.getOrElse("").trim
    if (noAllele.isEmpty) "." else noAllele
  }

  private[sample] def chainOf(v: String, locus: Option[String]): Option[String] = {
    val fromLocus = locus.map(_.trim.toUpperCase).filter(_.nonEmpty)
    val candidate = fromLocus.getOrElse(v.trim.toUpperCase)
    if (candidate.startsWith("TRA")) Some("TRA")
    else if (candidate.startsWith("TRB")) Some("TRB")
    else None
  }

  /** Most-frequent human codon per amino acid. Used only to synthesise `cdr3nt` when the input has no
    * nucleotide junction: vdjtools drops any row whose `cdr3nt` is empty (`NO_CDR3NT`), silently, so a
    * plain `v/j/cdr3aa` table would otherwise annotate to nothing with no explanation. The result is
    * in-frame and ACGT-only; it is NOT real sequence and must never be presented as such. */
  private final val Codon: Map[Char, String] = Map(
    'A' -> "GCC", 'C' -> "TGC", 'D' -> "GAC", 'E' -> "GAG", 'F' -> "TTC", 'G' -> "GGC",
    'H' -> "CAC", 'I' -> "ATC", 'K' -> "AAG", 'L' -> "CTG", 'M' -> "ATG", 'N' -> "AAC",
    'P' -> "CCC", 'Q' -> "CAG", 'R' -> "AGG", 'S' -> "AGC", 'T' -> "ACC", 'V' -> "GTG",
    'W' -> "TGG", 'Y' -> "TAC"
  )

  private[sample] def backTranslate(aa: String): String =
    aa.map(c => Codon.getOrElse(c.toUpper, "NNN")).mkString

  /** IMGT CDR3 excludes the conserved anchors that the junction (and therefore VDJdb) includes. */
  private[sample] def addAnchors(cdr3: String, chain: Option[String]): String = {
    val tail = chain match {
      case Some(c) if c.startsWith("IG") && c != "IGH" => "F"
      case Some("IGH")                                 => "W"
      case _                                           => "F" // TR loci close on Phe
    }
    s"C$cdr3$tail"
  }

  private[sample] def looksLikeJunction(aa: String): Boolean =
    aa.length >= 3 && aa.startsWith("C") && (aa.endsWith("F") || aa.endsWith("W"))

  private def open(input: File): Source = {
    val stream = new FileInputStream(input)
    val decoded: InputStream =
      if (input.getName.endsWith(".gz")) new GZIPInputStream(stream) else stream
    Source.fromInputStream(decoded)(Codec.UTF8)
  }

  private def splitLine(line: String): Array[String] = line.split("\t", -1)

  /**
    * Convert `input` (optionally gzipped) into one normalised gzipped VDJtools table per chain.
    *
    * Two passes over the file rather than buffering: pass one totals the counts (needed for `freq`,
    * and a zero `freq` makes vdjtools drop the row) and discovers which chains are present; pass two
    * writes. The file is local and already bounded, so re-reading costs far less than holding up to
    * `maxClonotypes` rows of every chain in the heap while several annotations run concurrently.
    *
    * @param maxClonotypes reject beyond this many usable rows per chain (0 = unlimited)
    */
  def convert(input: File, outputPrefix: File, maxClonotypes: Long): Report = {
    val warnings = mutable.LinkedHashSet.empty[String]

    val header = {
      val src = open(input)
      try src.getLines().find(l => l.trim.nonEmpty && !l.startsWith("#")).map(splitLine).getOrElse(Array.empty[String])
      finally src.close()
    }
    if (header.isEmpty) throw new ConversionException("The file appears to be empty")

    val format  = detectFormat(header)
    val columns = resolve(header)

    if (columns.aaColumn.isEmpty) {
      throw new ConversionException(
        "Could not find a CDR3 amino-acid column. Expected one of: cdr3aa, junction_aa, aaSeqCDR3 " +
          s"(detected format: $format, header: ${header.take(12).mkString(", ")})")
    }
    if (columns.v.isEmpty || columns.j.isEmpty) {
      throw new ConversionException(
        "Could not find V and J segment columns. Expected one of: v/j, v_call/j_call, allVHitsWithScore/allJHitsWithScore " +
          s"(detected format: $format, header: ${header.take(12).mkString(", ")})")
    }
    if (columns.usesImgtCdr3) {
      warnings += "The file provides IMGT CDR3 (anchors excluded); conserved C…F/W anchors were added " +
        "to match the junction convention VDJdb uses. Verify V/J assignments if match rates look low."
    }
    if (columns.junctionNt.isEmpty) {
      warnings += "No nucleotide junction column found; an in-frame placeholder was generated so rows " +
        "are not silently dropped. Nucleotide sequences shown for this sample are not real data."
    }

    // ---- pass 1: totals per chain -------------------------------------------------------------
    val totals = mutable.Map.empty[String, Long]
    val counts = mutable.Map.empty[String, Long]
    var read    = 0L
    var skipped = 0L

    forEachRow(input, columns) { row =>
      read += 1
      row match {
        case Some(r) =>
          totals(r.chain) = totals.getOrElse(r.chain, 0L) + r.count
          counts(r.chain) = counts.getOrElse(r.chain, 0L) + 1L
        case None => skipped += 1
      }
    }

    if (counts.isEmpty) {
      throw new ConversionException(
        s"No usable TRA/TRB clonotypes found in the file (read $read rows, skipped $skipped). " +
          "Only single-chain alpha/beta records are supported.")
    }
    if (maxClonotypes > 0) {
      counts.find(_._2 > maxClonotypes).foreach { case (chain, n) =>
        throw new ConversionException(
          s"Sample contains $n $chain clonotypes, which exceeds the limit of $maxClonotypes per sample")
      }
    }
    if (skipped > 0) warnings += s"$skipped of $read rows were skipped (non-productive, non-TRA/TRB, or malformed)"
    if (counts.size > 1) {
      warnings += s"File contains ${counts.keys.toSeq.sorted.mkString(" and ")} records; " +
        "it was split into one sample per chain, because a sample must be single-chain."
    }

    // ---- pass 2: write ------------------------------------------------------------------------
    val writers = counts.keys.map { chain =>
      val file = new File(s"${outputPrefix.getAbsolutePath}.$chain.txt.gz")
      chain -> (file, new PrintWriter(new OutputStreamWriter(
        new GZIPOutputStream(new FileOutputStream(file)), "UTF-8")))
    }.toMap

    try {
      writers.values.foreach { case (_, w) => w.println(OutputHeader) }
      forEachRow(input, columns) {
        case Some(r) =>
          writers.get(r.chain).foreach { case (_, w) =>
            val total = math.max(1L, totals.getOrElse(r.chain, 1L))
            val freq  = r.count.toDouble / total.toDouble
            w.println(s"${r.count}\t$freq\t${r.cdr3nt}\t${r.cdr3aa}\t${r.v}\t${r.d}\t${r.j}\t$NoSegmentMarkup")
          }
        case None => ()
      }
    } finally writers.values.foreach { case (_, w) => w.close() }

    Report(
      format      = format,
      chains      = writers.map { case (chain, (file, _)) => ChainOutput(chain, file, counts(chain)) }.toSeq.sortBy(_.chain),
      readRows    = read,
      skippedRows = skipped,
      warnings    = warnings.toSeq
    )
  }

  private final case class Row(chain: String, count: Long, cdr3nt: String, cdr3aa: String,
                               v: String, d: String, j: String)

  /** Stream the data rows, yielding `None` for anything unusable so callers can count skips. */
  private def forEachRow(input: File, c: Columns)(f: Option[Row] => Unit): Unit = {
    val src = open(input)
    try {
      var seenHeader = false
      src.getLines().foreach { line =>
        if (line.trim.isEmpty || line.startsWith("#")) {
          () // skip blanks and comments
        } else if (!seenHeader) {
          seenHeader = true // the header line itself
        } else {
          f(parseRow(splitLine(line), c))
        }
      }
    } finally src.close()
  }

  private def at(fields: Array[String], index: Option[Int]): Option[String] =
    index.filter(i => i >= 0 && i < fields.length).map(fields(_).trim).filter(_.nonEmpty)

  private[sample] def parseRow(fields: Array[String], c: Columns): Option[Row] = {
    val productiveOk = at(fields, c.productive).forall { p =>
      val v = p.toLowerCase
      v == "t" || v == "true" || v == "1" || v == "yes"
    }
    if (!productiveOk) return None

    val rawAa = at(fields, c.aaColumn).getOrElse("")
    if (rawAa.isEmpty || !rawAa.forall(ch => ch.isLetter)) return None
    // Stop codons / frameshift markers make a clonotype unusable for matching.
    if (rawAa.exists(ch => ch == '*' || ch == '_')) return None

    val vRaw = at(fields, c.v).getOrElse("")
    val jRaw = at(fields, c.j).getOrElse("")
    if (vRaw.isEmpty || jRaw.isEmpty) return None

    val v = cleanSegment(vRaw)
    val j = cleanSegment(jRaw)
    val d = at(fields, c.d).map(cleanSegment).getOrElse(".")

    val chain = chainOf(v, at(fields, c.locus)) match {
      case Some(ch) => ch
      case None     => return None // only single-chain TRA/TRB are supported
    }

    // Anchors: only add them when the column is declared IMGT. A bare `cdr3aa` that already looks
    // like a junction is left alone — guessing an anchor onto a sequence that has one corrupts it.
    val cdr3aa =
      if (c.usesImgtCdr3 && !looksLikeJunction(rawAa)) addAnchors(rawAa, Some(chain)) else rawAa

    val count = at(fields, c.count).flatMap(s => scala.util.Try(s.toDouble.toLong).toOption).getOrElse(1L)
    if (count <= 0) return None

    val cdr3nt = at(fields, c.junctionNt)
      .map(_.toUpperCase.filter(ch => "ACGTN".contains(ch)))
      .filter(nt => nt.nonEmpty && nt.length == cdr3aa.length * 3)
      .getOrElse(backTranslate(cdr3aa))

    Some(Row(chain, count, cdr3nt, cdr3aa, v, d, j))
  }
}

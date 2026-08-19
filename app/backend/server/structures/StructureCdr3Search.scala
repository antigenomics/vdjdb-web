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

package backend.server.structures

import java.util.Locale

import backend.server.structures.api.cdr3.StructureCDR3SearchEntry
import backend.server.structures.api.epitope.StructureCluster
import tech.tablesaw.api.Table

import scala.collection.mutable

/** Matching and ranking behind `POST /api/structures/cdr3`.
  *
  * Separated from `Structures` because none of it needs the loaded database — it works on whatever
  * table it is handed — while the surrounding method does, and that made the scoring rules
  * unreachable from a test.
  */
object StructureCdr3Search {

  /** Hard ceiling on results, whatever the client asks for. Each entry costs a cluster build, which
    * is a table scan plus a filesystem stat. */
  final val MaxResults: Int = 15

  /** Both chains, i.e. no gene filter. Anything that is not TRA or TRB means this. */
  final val BothChains: String = "BOTH"

  /** What one structure accumulated across the rows that matched. */
  final case class MatchStats(matches: Int, patternCounts: Map[String, Int], chainLabels: Set[String])

  /** A structure that matched, with both its scores, before either ranking is applied. */
  final case class Candidate(cluster: StructureCluster,
                             score: Double,
                             normalizedScore: Double,
                             pattern: String,
                             chain: Option[String])

  /** `top <= 0` means the maximum rather than nothing, which is what makes an omitted parameter
    * behave like a sensible default instead of returning an empty page. */
  def resultLimit(requested: Int): Int =
    math.max(1, math.min(MaxResults, if (requested <= 0) MaxResults else requested))

  def normalizeGene(gene: String): String =
    Option(gene).map(_.trim.toUpperCase(Locale.ROOT)).filter(_.nonEmpty).getOrElse(BothChains)

  /** Only TRA and TRB narrow the table. Anything else — including [[BothChains]] and a typo — is a
    * pass-through, so an unrecognised gene widens the search rather than emptying it. */
  def filterByGene(table: Table, gene: String): Table =
    if (!table.columnNames().contains("gene")) table
    else gene match {
      case "TRA" | "TRB" => table.where(table.stringColumn("gene").isEqualTo(gene))
      case _ => table
    }

  def chainLabelFor(gene: String): Option[String] =
    Option(gene).map(_.trim.toUpperCase(Locale.ROOT)).collect {
      case "TRA" => "CDR3a"
      case "TRB" => "CDR3b"
    }

  /** One pass over the table, tallying per structure: how many rows matched, which masked patterns
    * they produced, and which chains they were on.
    *
    * Case-insensitive throughout. `substring` decides `contains` against `equals`.
    */
  def tally(table: Table, query: String, substring: Boolean): Map[String, MatchStats] = {
    if (query.isEmpty || !table.columnNames().contains("cdr3") || !table.columnNames().contains("structure.id")) {
      return Map.empty
    }

    val cdr3Column = table.stringColumn("cdr3")
    val structureColumn = table.stringColumn("structure.id")
    val geneColumn = if (table.columnNames().contains("gene")) Some(table.stringColumn("gene")) else None
    val queryUpper = query.toUpperCase(Locale.ROOT)

    val tallies = mutable.LinkedHashMap.empty[String, MatchStats]

    (0 until table.rowCount()).foreach { row =>
      val structureId = Option(structureColumn.get(row)).map(_.trim).getOrElse("")
      val candidate = Option(cdr3Column.get(row)).map(_.trim.toUpperCase(Locale.ROOT)).getOrElse("")
      val matched = if (substring) candidate.contains(queryUpper) else candidate == queryUpper

      if (structureId.nonEmpty && matched) {
        val pattern = StructureIdentifiers.substringPattern(candidate, queryUpper, substring)
        val label = geneColumn.flatMap(column => Option(column.get(row))).flatMap(chainLabelFor)
        val current = tallies.getOrElse(structureId, MatchStats(0, Map.empty, Set.empty))

        tallies.update(structureId, MatchStats(
          matches = current.matches + 1,
          patternCounts = current.patternCounts.updated(pattern, current.patternCounts.getOrElse(pattern, 0) + 1),
          chainLabels = current.chainLabels ++ label))
      }
    }

    tallies.toMap
  }

  /** Both orderings of the same candidates: by raw match count, and by count over cluster size.
    *
    * The raw count favours large clusters simply for being large; the normalized one favours
    * clusters where the query accounts for most of the members. Neither is right on its own, which
    * is why the response carries both.
    */
  def rank(candidates: Seq[Candidate], limit: Int): (Seq[StructureCDR3SearchEntry], Seq[StructureCDR3SearchEntry]) = {
    def entries(ordering: Candidate => Double, score: Candidate => Double): Seq[StructureCDR3SearchEntry] =
      distinctClusters(candidates.sortBy(candidate => -ordering(candidate)), limit)
        .map(candidate => StructureCDR3SearchEntry(score(candidate), candidate.pattern, candidate.chain, candidate.cluster))

    (entries(_.score, _.score), entries(_.normalizedScore, _.normalizedScore))
  }

  /** First `limit` candidates with distinct cluster ids, in the order given.
    *
    * A duplicate does not cost a slot — the walk continues and the page is topped up from further
    * down. Fewer than `limit` come back only when the list runs out of distinct clusters, which is
    * the ordinary case for a narrow query.
    */
  def distinctClusters(candidates: Seq[Candidate], limit: Int): Seq[Candidate] =
    if (limit <= 0) Seq.empty
    else {
      val seen = mutable.HashSet.empty[String]
      candidates.iterator
        .filter(candidate => seen.add(candidate.cluster.clusterId))
        .take(math.min(limit, candidates.length))
        .toVector
    }
}

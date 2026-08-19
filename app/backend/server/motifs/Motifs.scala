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

package backend.server.motifs

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.database.Database
import backend.server.motifs.api.cdr3.{MotifCDR3SearchEntry, MotifCDR3SearchResult, MotifCDR3SearchResultOptions}
import backend.server.motifs.api.epitope.{MotifCluster, MotifEpitope}
import backend.server.motifs.api.filter.{MotifsSearchTreeFilter, MotifsSearchTreeFilterResult}
import backend.server.motifs.export.ClusterMembersConverter
import backend.utils.CommonUtils
import com.antigenomics.vdjdb.db.Row
import javax.inject.{Inject, Singleton}
import tech.tablesaw.api.{ColumnType, Table}
import tech.tablesaw.io.csv.CsvReadOptions

import java.util.Locale
import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Success

@Singleton
case class Motifs @Inject()(database: Database)(implicit tfp: TemporaryFileProvider, ec: ExecutionContext) {
  private final val metadataLevels = Seq("species", "gene", "mhc.class", "mhc.a", "antigen.epitope")

  // One per clustering method, built the same way from a different pair of files. Everything either
  // dataset offers is derived from those two, which is why this is a value rather than twelve
  // parallel fields and nine accessors picking between them by name.
  private final val tcrnet = MotifDataset.load(
    database.getMotifFile.map(_.getPath), database.getClusterMembersFile.map(_.getPath), metadataLevels)
  private final val tcremp = MotifDataset.load(
    database.getMotifFileTCREMP.map(_.getPath), database.getClusterMembersFileTCREMP.map(_.getPath), metadataLevels)

  /** TCRNet is the default: the parameter is absent on every request that predates the TCREMP tab. */
  private def datasetFor(method: Option[String]): MotifDataset =
    if (Motifs.isTcremp(method)) tcremp else tcrnet

  def getMembers(method: Option[String] = None): Table = datasetFor(method).members

  def getTable(method: Option[String] = None): Table = datasetFor(method).table

  def getMetadata(method: Option[String] = None): MotifsMetadata = datasetFor(method).metadata

  def getAvailabilityKeys(method: Option[String] = None): Set[String] = datasetFor(method).availabilityKeys

  def getCidLookupIndex(method: Option[String] = None): Map[String, String] = datasetFor(method).cidLookupIndex

  def filter(filter: MotifsSearchTreeFilter)(implicit ec: ExecutionContext): Future[Option[MotifsSearchTreeFilterResult]] = {
    val table = datasetFor(filter.method).table
    Future {
      filter.entries.map(h => table.stringColumn(h.name).isEqualTo(h.value)).reduceRightOption((left, right) => left.and(right)).map { selection =>
        val filtered = table.where(selection)
        filtered.splitOn(filtered.stringColumn("antigen.epitope")).asTableList().asScala.map { epitopeTable =>
          val epitopes = epitopeTable.stringColumn("antigen.epitope").asSet()

          assert(epitopes.size == 1)

          val hash = CommonUtils.md5(metadataLevels.map(level => {
            val meta = epitopeTable.stringColumn(level).asSet.asScala

            assert(meta.nonEmpty)

            meta.head
          }).reduce(_ + _))

          MotifEpitope(
            epitopes.asScala.toSeq.head,
            hash,
            epitopeTable.splitOn(epitopeTable.stringColumn("cid")).asTableList().asScala.flatMap { cidTable =>
              cidTable.splitOn(cidTable.intColumn("len")).asTableList().asScala.map { cidLenTable =>
                MotifCluster.fromTable(cidLenTable, strict = !Motifs.isTcremp(filter.method))
              }
            }
          )
        }
      }.map { epitopes =>
        MotifsSearchTreeFilterResult(epitopes)
      }
    }
  }

  def cdr3(cdr3: String, substring: Boolean, gene: String, top: Int, method: Option[String] = None): Future[MotifCDR3SearchResult] = {
    val results = if (substring) {
      substring_cdr3(cdr3, gene, top, method)
    } else {
      whole_cdr3(cdr3, gene, top, method)
    }

    results.map { r =>
      MotifCDR3SearchResult(r.options, r.clusters.filter(_.info > 0.0), r.clustersNorm.filter(_.info > 0.0))
    }
  }

  private def whole_cdr3(cdr3: String, gene: String, top: Int, method: Option[String]): Future[MotifCDR3SearchResult] = Future.successful {
    val table = datasetFor(method).table
    val isTcrempMethod = Motifs.isTcremp(method)
    val filterRules = table.intColumn("len").isEqualTo(cdr3.length.toDouble)
      .and(
        if (gene != "TRA" && gene != "TRB")
          table.stringColumn("gene").isIn("TRA", "TRB")
        else
          table.stringColumn("gene").isEqualTo(gene)
      )

    val mapped = table.where(filterRules).splitOn(table.stringColumn("cid")).asTableList().asScala.map { t =>
      val info: Seq[(Double, Double)] = t.splitOn("pos").asTableList().asScala.map { p =>
        val posSet = p.intColumn("pos").asScala.toSet
        assert(posSet.size == 1)

        val pos = posSet.head
        val target = String.valueOf(cdr3(pos))

        val i: (Double, Double) = if (isTcrempMethod) {
          // tcremp: reuse the cluster-PWM aggregation (letter-frequency based) so the CDR3-search
          // ranking matches the displayed logo. Pick the target AA's raw and background-subtracted heights.
          val entry = backend.server.motifs.api.epitope.MotifClusterEntry.fromTable(p, aggregate = true)
          entry.aa.find(_.letter == target).map(a => (a.H, a.HNorm)).getOrElse((0.0d, 0.0d))
        } else {
          val index = p.stringColumn("aa").firstIndexOf(target)
          if (index != -1) {
            val I = p.doubleColumn("height.I").get(index)
            val Inorm = p.doubleColumn("height.I.norm").get(index)
            (I, Inorm)
          } else {
            (0.0d, 0.0d)
          }
        }
        i
      }
      val reduced = info.reduce((l, r) => (l._1 + r._1, l._2 + r._2))
      (reduced._1, reduced._2, MotifCluster.fromTable(t, strict = !isTcrempMethod))
    }

    val safeTop = Math.max(1, Math.min(Motifs.maxTopValueInCDR3Search, top))
    val clusters = mapped.sortWith(_._1 > _._1).take(safeTop).map { case (i, _, cluster) => MotifCDR3SearchEntry(i, cdr3, cluster) }
    val clustersNorm = mapped.sortWith(_._2 > _._2).take(safeTop).map { case (_, in, cluster) => MotifCDR3SearchEntry(in, cdr3, cluster) }

    MotifCDR3SearchResult(MotifCDR3SearchResultOptions(cdr3, safeTop, gene, substring = false), clusters, clustersNorm)
  }

  private def substring_cdr3(cdr3: String, gene: String, top: Int, method: Option[String]): Future[MotifCDR3SearchResult] = {
    val cdr3Range = datasetFor(method).cdr3Range
    if (cdr3.length < Motifs.minSubstringCDR3Length) {
      Future.failed(new IllegalArgumentException("Illegal CDR3 length"))
    } else if (cdr3.length > cdr3Range._2) {
      Future.successful(MotifCDR3SearchResult(MotifCDR3SearchResultOptions(cdr3, top, gene, substring = true), Seq(), Seq()))
    } else {
      val safeTop = Math.max(1, Math.min(Motifs.maxTopValueInCDR3Search, top))

      val fakeCDR3s = (Math.max(cdr3.length, cdr3Range._1) to cdr3Range._2 + 1).flatMap(length => {
        (0 to (length - cdr3.length)).map(f => ("X" * f) + cdr3 + ("X" * (length - cdr3.length - f)))
      })

      val futureResults = Future.sequence(fakeCDR3s.map(fake => whole_cdr3(fake, gene, safeTop, method)).map(_.transform(Success(_)))).map(_.collect { case Success(x) => x })
      val topEntries = futureResults.map(_.map(s => (s.clusters, s.clustersNorm)).reduce((l, r) => (l._1 ++ r._1, l._2 ++ r._2))).map(d => {
        (d._1.distinct.sortWith(_.info > _.info).take(safeTop), d._2.distinct.sortWith(_.info > _.info).take(safeTop))
      })

      topEntries.map(e => MotifCDR3SearchResult(MotifCDR3SearchResultOptions(cdr3, safeTop, gene, substring = true), e._1, e._2))
    }
  }

  def members(cid: String, format: String, method: Option[String] = None): Option[Future[TemporaryFileLink]] = {
    val members = datasetFor(method).members
    ClusterMembersConverter.getConverter(format).map(_.convert(members.where(members.stringColumn("cid").isEqualTo(cid)), cid))
  }
}

object Motifs {

  /** Which clustering method a request asked for. Absent means TCRNet, the default. */
  def isTcremp(method: Option[String]): Boolean = method.exists(_.equalsIgnoreCase("tcremp"))

  private final val maxTopValueInCDR3Search: Int = 15
  private final val minSubstringCDR3Length: Int = 3

  private[motifs] def buildAvailabilityKeys(table: Table): Set[String] = {
    val requiredColumns = Seq("species", "gene", "mhc.class", "mhc.a", "antigen.epitope")
    if (!requiredColumns.forall(table.columnNames().contains)) {
      Set.empty
    } else {
      val speciesCol = table.stringColumn("species")
      val geneCol = table.stringColumn("gene")
      val mhcClassCol = table.stringColumn("mhc.class")
      val mhcACol = table.stringColumn("mhc.a")
      val epitopeCol = table.stringColumn("antigen.epitope")
      val builder = mutable.HashSet.empty[String]
      var idx = 0
      val total = table.rowCount()
      while (idx < total) {
        val values = Seq(speciesCol.get(idx), geneCol.get(idx), mhcClassCol.get(idx), mhcACol.get(idx), epitopeCol.get(idx))
          .map(v => Option(v).map(_.trim).getOrElse(""))
        if (values.forall(_.nonEmpty)) {
          builder += values.map(_.toLowerCase(Locale.ROOT)).mkString("|")
        }
        idx += 1
      }
      builder.toSet
    }
  }

  /** The VDJdb side of the join key that [[buildCidLookupIndex]] builds from the cluster-members side.
    *
    * Kept next to the index it has to agree with, because the two halves are easy to get subtly wrong:
    * the members file calls the CDR3 column `cdr3aa` while a VDJdb record calls it `cdr3`, and the
    * normalisation (trim, then lower-case in [[java.util.Locale.ROOT]] rather than the default locale)
    * has to be identical on both sides or a Turkish-locale server would stop matching anything with an
    * `I` in it.
    *
    * The MHC columns are part of the key and have to be, because a peptide is not one antigen: the same
    * sequence presented by two alleles is two pMHC complexes, clustered separately. `RPIIRPATL` is
    * curated in VDJdb under both HLA-B*07:02 (97 records) and HLA-B*08:01 (162), and the two tools
    * clustered different halves of it — every TCREMP cluster for that epitope is B*07:02, the one TCRNET
    * cluster is B*08:01. The cluster ids are even reused across the files: `H.B.RPIIRPATL.1` names a
    * B*08:01 cluster in one and a B*07:02 cluster in the other. Drop MHC from the key and those two
    * collapse, so `CASSMIPDMNTEAFF` / TRBV19 / TRBJ1-1 — recorded in VDJdb only under B*08:01 — comes
    * back from a "TCREMP only" search as a member of a B*07:02 cluster it has nothing to do with.
    *
    * This was once removed again on the grounds that `mhc.a` is constant within every cluster and so
    * must be a label on the cluster rather than a fact about the member. It is constant for the reason
    * above — clustering runs per restriction — and the member's own MHC agrees with its VDJdb record in
    * 94.7% of TCRNET rows and 90.0% of TCREMP rows. Where it disagrees the members file is describing a
    * record under a restriction VDJdb does not give it, and no badge is the honest answer; matching it
    * to a differently-restricted record is not.
    *
    * `None` when any component is blank — an incomplete key would collide with every other incomplete
    * key and match records it has no business matching.
    */
  def motifKey(row: Row): Option[String] = {
    val parts = Motifs.MotifKeyColumns
      .map(column => Option(row.getAt(column)).map(_.getValue.trim.toLowerCase(Locale.ROOT)).getOrElse(""))
    if (parts.forall(_.nonEmpty)) Some(parts.mkString("|")) else None
  }

  /** The VDJdb column names of the join key, in order. The members file spells the CDR3 `cdr3aa`;
    * [[buildCidLookupIndex]] substitutes that one name and otherwise reads these in this order, so the
    * two halves cannot drift apart in either membership or ordering. */
  private[motifs] final val MotifKeyColumns: Seq[String] =
    Seq("species", "gene", "antigen.epitope", "cdr3", "v.segm", "j.segm", "mhc.a", "mhc.b", "mhc.class")

  def buildCidLookupIndex(members: Table): Map[String, String] = {
    val memberColumns = MotifKeyColumns.map(c => if (c == "cdr3") "cdr3aa" else c)
    val required = memberColumns :+ "cid"
    if (!required.forall(members.columnNames().contains)) {
      return Map.empty
    }
    // Resolved from the shared list rather than named one by one, so a column added to the key cannot
    // be added on only one side of the join.
    val keyCols = memberColumns.map(members.stringColumn)
    val cidCol = members.stringColumn("cid")
    val builder = mutable.HashMap.empty[String, String]
    var idx = 0
    val total = members.rowCount()
    while (idx < total) {
      val parts = keyCols.map(col => Option(col.get(idx)).map(_.trim).getOrElse("").toLowerCase(Locale.ROOT))
      val cid = Option(cidCol.get(idx)).map(_.trim).getOrElse("")
      if (parts.forall(_.nonEmpty) && cid.nonEmpty) {
        val key = parts.mkString("|")
        if (!builder.contains(key)) {
          builder.update(key, cid)
        }
      }
      idx += 1
    }
    builder.toMap
  }

  def parseMotifFileIntoDataFrame(path: Option[String]): Table = {
    path match {
      case Some(p) =>
        val columnTypes: Array[ColumnType] = Array(
          ColumnType.STRING, // species
          ColumnType.STRING, // antigen.epitope
          ColumnType.STRING, // gene
          ColumnType.STRING, // aa
          ColumnType.INTEGER, // pos
          ColumnType.INTEGER, // len
          ColumnType.STRING, // v.segm.repr
          ColumnType.STRING, // j.segm.repr
          ColumnType.STRING, // cid
          ColumnType.DOUBLE, // csz
          ColumnType.INTEGER, // count
          ColumnType.SKIP, // count.bg
          ColumnType.SKIP, // total.bg
          ColumnType.SKIP, // count.bg.i
          ColumnType.SKIP, // total.bg.i
          ColumnType.SKIP, // need.impute
          ColumnType.DOUBLE, // freq
          ColumnType.SKIP, // freq.bg
          ColumnType.DOUBLE, // I
          ColumnType.DOUBLE, // I.norm
          ColumnType.DOUBLE, // height.I
          ColumnType.DOUBLE, // height.I.norm
          ColumnType.STRING, // antigen.gene
          ColumnType.STRING, // antigen.species
          ColumnType.STRING, // mhc.a
          ColumnType.STRING, // mhc.b
          ColumnType.STRING, // mhc.class
        )
        val builder = CsvReadOptions.builder(p)
          .separator('\t')
          .header(true)
          .columnTypes(columnTypes)
        val options = builder.build()
        val table = Table.read().csv(options)

        table.replaceColumn("mhc.a", table.stringColumn("mhc.a").replaceAll(":.+", "").setName("mhc.a"))
        table.replaceColumn("mhc.b", table.stringColumn("mhc.b").replaceAll(":.+", "").setName("mhc.b"))

      case None => Table.create("")
    }
  }

  def parseClusterMembersFileIntoDataFrame(path: Option[String]): Table = {
    path match {
      case Some(p) =>
        val columnTypes: Array[ColumnType] = Array(
          ColumnType.STRING, // species
          ColumnType.STRING, // antigen.epitope
          ColumnType.STRING, // antigen.gene
          ColumnType.STRING, // antigen.species
          ColumnType.STRING, // mhc.a
          ColumnType.STRING, // mhc.b
          ColumnType.STRING, // mhc.class
          ColumnType.STRING, // gene
          ColumnType.STRING, // cdr3aa
          ColumnType.SKIP, // x
          ColumnType.SKIP, // y
          ColumnType.STRING, // cid
          ColumnType.STRING, // csz
          ColumnType.STRING, // v.segm
          ColumnType.STRING, // j.segm
          ColumnType.STRING, // v.end
          ColumnType.STRING, // j.start
          ColumnType.STRING, // v.segm.repr
          ColumnType.STRING, // j.segm.repr
        )
        val builder = CsvReadOptions.builder(p)
          .separator('\t')
          .header(true)
          .columnTypes(columnTypes)
        val options = builder.build()
        Table.read().csv(options)
      case None => Table.create("")
    }
  }

  def parseCDR3LengthRange(table: Table): (Int, Int) = {
    if (table.columnNames().contains("len")) {
      val lengths = table.intColumn("len").asScala.toSet
      if (lengths.nonEmpty) (lengths.min, lengths.max) else (0, 0)
    } else {
      (0, 0)
    }
  }
}

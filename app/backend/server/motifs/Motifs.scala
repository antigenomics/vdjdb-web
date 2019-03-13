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
import javax.inject.{Inject, Singleton}
import tech.tablesaw.api.{ColumnType, Table}
import tech.tablesaw.io.csv.CsvReadOptions

import scala.collection.JavaConverters._
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Success

@Singleton
case class Motifs @Inject()(database: Database)(implicit tfp: TemporaryFileProvider, ec: ExecutionContext) {
  private final val members = Motifs.parseClusterMembersFileIntoDataFrame(database.getClusterMembersFile.map(_.getPath))
  private final val table = Motifs.parseMotifFileIntoDataFrame(database.getMotifFile.map(_.getPath))
  private final val cdr3Range = Motifs.parseCDR3LengthRange(table)

  private final val metadataLevels = Seq("species", "gene", "mhc.class", "mhc.a", "antigen.epitope")
  private final val metadata = MotifsMetadata.generateMetadataFromLevels(table, metadataLevels)

  def getMembers: Table = members

  def getTable: Table = table

  def getMetadata: MotifsMetadata = metadata

  def filter(filter: MotifsSearchTreeFilter): Option[MotifsSearchTreeFilterResult] = {
    filter.entries.map(h => table.stringColumn(h.name).isEqualTo(h.value)).reduceRightOption((left, right) => left.and(right)).map { selection =>
      table.where(selection).splitOn(table.stringColumn("antigen.epitope")).asTableList().asScala.map { epitopeTable =>
        val epitopes = epitopeTable.stringColumn("antigen.epitope").asSet()

        assert(epitopes.size == 1)

        val hash = CommonUtils.md5(metadataLevels.map(level => {
          val meta = epitopeTable.stringColumn(level).asSet.asScala

          assert(meta.size == 1)

          meta.head
        }).reduce(_ + _))

        MotifEpitope(
          epitopes.asScala.toSeq.head,
          hash,
          epitopeTable.splitOn(table.stringColumn("cid")).asTableList().asScala.map(MotifCluster.fromTable)
        )
      }
    }.map { epitopes =>
      MotifsSearchTreeFilterResult(epitopes)
    }
  }

  def cdr3(cdr3: String, substring: Boolean, gene: String, top: Int): Future[MotifCDR3SearchResult] = {
    val results = if (substring) {
      substring_cdr3(cdr3, gene, top)
    } else {
      whole_cdr3(cdr3, gene, top)
    }

    results.map { r =>
      MotifCDR3SearchResult(r.options, r.clusters.filter(_.info > 0.0), r.clustersNorm.filter(_.info > 0.0))
    }
  }

  private def whole_cdr3(cdr3: String, gene: String, top: Int): Future[MotifCDR3SearchResult] = Future.successful {
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
        val index = p.stringColumn("aa").firstIndexOf(String.valueOf(cdr3(pos)))

        val i: (Double, Double) = if (index != -1) {
          val I = p.doubleColumn("height.I").get(index)
          val Inorm = p.doubleColumn("height.I.norm").get(index)

          (I, Inorm)
        } else {
          (0.0d, 0.0d)
        }
        i
      }
      val reduced = info.reduce((l, r) => (l._1 + r._1, l._2 + r._2))
      (reduced._1, reduced._2, MotifCluster.fromTable(t))
    }

    val safeTop = Math.max(1, Math.min(Motifs.maxTopValueInCDR3Search, top))
    val clusters = mapped.sortWith(_._1 > _._1).take(safeTop).map { case (i, _, cluster) => MotifCDR3SearchEntry(i, cdr3, cluster) }
    val clustersNorm = mapped.sortWith(_._2 > _._2).take(safeTop).map { case (_, in, cluster) => MotifCDR3SearchEntry(in, cdr3, cluster) }

    MotifCDR3SearchResult(MotifCDR3SearchResultOptions(cdr3, safeTop, gene, substring = false), clusters, clustersNorm)
  }

  private def substring_cdr3(cdr3: String, gene: String, top: Int): Future[MotifCDR3SearchResult] = {
    if (cdr3.length < Motifs.minSubstringCDR3Length) {
      Future.failed(new IllegalArgumentException("Illegal CDR3 length"))
    } else if (cdr3.length > cdr3Range._2) {
      Future.successful(MotifCDR3SearchResult(MotifCDR3SearchResultOptions(cdr3, top, gene, substring = true), Seq(), Seq()))
    } else {
      val safeTop = Math.max(1, Math.min(Motifs.maxTopValueInCDR3Search, top))

      val fakeCDR3s = (Math.max(cdr3.length, cdr3Range._1) to cdr3Range._2 + 1).flatMap(length => {
        (0 to (length - cdr3.length)).map(f => ("X" * f) + cdr3 + ("X" * (length - cdr3.length - f)))
      })

      val futureResults = Future.sequence(fakeCDR3s.map(fake => whole_cdr3(fake, gene, safeTop)).map(_.transform(Success(_)))).map(_.collect { case Success(x) => x })
      val topEntries = futureResults.map(_.map(s => (s.clusters, s.clustersNorm)).reduce((l, r) => (l._1 ++ r._1, l._2 ++ r._2))).map(d => {
        (d._1.distinct.sortWith(_.info > _.info).take(safeTop), d._2.distinct.sortWith(_.info > _.info).take(safeTop))
      })

      topEntries.map(e => MotifCDR3SearchResult(MotifCDR3SearchResultOptions(cdr3, safeTop, gene, substring = true), e._1, e._2))
    }
  }

  def members(cid: String, format: String): Option[Future[TemporaryFileLink]] = {
    ClusterMembersConverter.getConverter(format).map(_.convert(members.where(members.stringColumn("cid").isEqualTo(cid)), cid))
  }
}

object Motifs {
  private final val maxTopValueInCDR3Search: Int = 15
  private final val minSubstringCDR3Length: Int = 3

  def parseMotifFileIntoDataFrame(path: Option[String]): Table = {
    path match {
      case Some(p) =>
        // TODO metadata file
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
          ColumnType.INTEGER, // csz
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
        Table.read().csv(options)
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
    val lengths = table.intColumn("len").asScala.toSet
    (lengths.min, lengths.max)
  }
}

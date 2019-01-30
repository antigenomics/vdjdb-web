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
import backend.server.motifs.api.cdr3.{MotifCDR3SearchEntry, MotifCDR3SearchResult}
import backend.server.motifs.api.epitope.{MotifCluster, MotifEpitope}
import backend.server.motifs.api.export.ClusterMembersExportResponse
import backend.server.motifs.api.filter.{MotifsSearchTreeFilter, MotifsSearchTreeFilterResult}
import backend.server.motifs.export.ClusterMembersConverter
import javax.inject.{Inject, Singleton}
import tech.tablesaw.api.{ColumnType, Table}
import tech.tablesaw.io.csv.CsvReadOptions

import scala.collection.JavaConverters._
import scala.concurrent.Future

@Singleton
case class Motifs @Inject()(database: Database)(implicit tfp: TemporaryFileProvider) {
  private final val members = Motifs.parseClusterMembersFileIntoDataFrame(database.getClusterMembersFile.map(_.getPath))
  private final val table = Motifs.parseMotifFileIntoDataFrame(database.getMotifFile.map(_.getPath))

  private final val metadataLevels = Seq("species", "gene", "mhc.class", "mhc.a", "antigen.epitope")
  private final val metadata = MotifsMetadata.generateMetadataFromLevels(table, metadataLevels)

  def getMembers: Table = members

  def getTable: Table = table

  def getMetadata: MotifsMetadata = metadata

  def filter(filter: MotifsSearchTreeFilter): Option[MotifsSearchTreeFilterResult] = {
    filter.entries.map(h => table.stringColumn(h.name).isEqualTo(h.value)).reduceRightOption((left, right) => left.and(right)).map { selection =>
      table.where(selection).splitOn(table.stringColumn("antigen.epitope")).asTableList().asScala.map { epitopeTable =>
        val epitopes = epitopeTable.stringColumn("antigen.epitope").asSet()

        assert(epitopes.size() == 1)

        MotifEpitope(
          epitopes.asScala.toSeq.head,
          epitopeTable.splitOn(table.stringColumn("cid")).asTableList().asScala.map(MotifCluster.fromTable)
        )
      }
    }.map { epitopes =>
      MotifsSearchTreeFilterResult(epitopes)
    }
  }

  def cdr3(cdr3: String, top: Int): Option[MotifCDR3SearchResult] = {
    val mapped = table.where(table.intColumn("len").isEqualTo(cdr3.length.toDouble)).splitOn(table.stringColumn("cid")).asTableList().asScala.map { t =>
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
    val clusters = mapped.sortWith(_._1 > _._1).take(safeTop).map { case (i, _, cluster) => MotifCDR3SearchEntry(i, cluster) }
    val clustersNorm = mapped.sortWith(_._2 > _._2).take(safeTop).map { case (_, in, cluster) => MotifCDR3SearchEntry(in, cluster) }

    Some(MotifCDR3SearchResult(cdr3, safeTop, clusters, clustersNorm))
  }

  def members(cid: String, format: String): Option[Future[TemporaryFileLink]] = {
    ClusterMembersConverter.getConverter(format).map(_.convert(members.where(members.stringColumn("cid").isEqualTo(cid)), cid))
  }
}

object Motifs {
  private final val maxTopValueInCDR3Search: Int = 15

  def parseMotifFileIntoDataFrame(path: Option[String]): Table = {
    path match {
      case Some(p) =>
        // TODO metadata file
        val columnTypes: Array[ColumnType] = Array(
          ColumnType.STRING, // species
          ColumnType.STRING, // antigen.epitope
          ColumnType.STRING, // gene
          ColumnType.STRING, // aa
          ColumnType.INTEGER,// pos
          ColumnType.INTEGER,// len
          ColumnType.STRING, // v.segm.repr
          ColumnType.STRING, // j.segm.repr
          ColumnType.STRING, // cid
          ColumnType.INTEGER,// csz
          ColumnType.INTEGER,// count
          ColumnType.SKIP,   // count.bg
          ColumnType.SKIP,   // total.bg
          ColumnType.SKIP,   // count.bg.i
          ColumnType.SKIP,   // total.bg.i
          ColumnType.SKIP,   // need.impute
          ColumnType.DOUBLE, // freq
          ColumnType.SKIP,   // freq.bg
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
}

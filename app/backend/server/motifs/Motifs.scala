/*
 *     Copyright 2017-2018 Bagaev Dmitry
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

import backend.server.database.Database
import backend.server.motifs.api.cdr3.{MotifCDR3SearchEntry, MotifCDR3SearchResult}
import backend.server.motifs.api.epitope.{MotifCluster, MotifEpitope}
import backend.server.motifs.api.filter.{MotifsSearchTreeFilter, MotifsSearchTreeFilterResult}
import javax.inject.{Inject, Singleton}
import tech.tablesaw.api.{ColumnType, Table}
import tech.tablesaw.io.csv.CsvReadOptions

import scala.collection.JavaConverters._

@Singleton
case class Motifs @Inject()(database: Database) {
  private final val table = Motifs.parseMotifFileIntoDataFrame(database.getMotifFile.map(_.getPath))

  private final val metadataLevels = Seq("species", "gene", "mhc.class", "mhc.a", "antigen.epitope")
  private final val metadata = MotifsMetadata.generateMetadataFromLevels(table, metadataLevels)

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
        val i: (Double, Double) = if (p.stringColumn("aa").asSet().asScala.contains(String.valueOf(cdr3(pos)))) {
          val I = p.doubleColumn("I").asScala.toSet
          val Inorm = p.doubleColumn("I.norm").asScala.toSet

          assert(I.size == 1 && Inorm.size == 1)

          (I.head, Inorm.head)
        } else {
          (0.0d, 0.0d)
        }
        i
      }
      val reduced = info.reduce((l, r) => (l._1 + r._1, l._2 + r._2))
      (reduced._1, reduced._2, MotifCluster.fromTable(t))
    }

    val safeTop = Math.max(1, Math.min(15, top))
    val clusters = mapped.sortWith(_._1 > _._1).take(safeTop).map { case (i, _, cluster) => MotifCDR3SearchEntry(i, cluster) }
    val clustersNorm = mapped.sortWith(_._2 > _._2).take(safeTop).map { case (_, in, cluster) => MotifCDR3SearchEntry(in, cluster) }

    Some(MotifCDR3SearchResult(cdr3, safeTop, clusters, clustersNorm))
  }
}

object Motifs {
  def parseMotifFileIntoDataFrame(path: Option[String]): Table = {
    path match {
      case Some(p) =>
        // TODO metadata file
        val columnTypes: Array[ColumnType] = Array(
          ColumnType.STRING, // cid
          ColumnType.STRING, // mhc.class
          ColumnType.STRING, // mhc.a
          ColumnType.STRING, // mhc.b
          ColumnType.STRING, // species
          ColumnType.STRING, // gene
          ColumnType.STRING, // aa
          ColumnType.INTEGER, // pos
          ColumnType.INTEGER, // len
          ColumnType.STRING, // v.segm.repr
          ColumnType.STRING, // j.segm.repr
          ColumnType.STRING, // antigen.epitope
          ColumnType.INTEGER, // csz (cluster size)
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

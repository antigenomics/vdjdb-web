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
import javax.inject.{Inject, Singleton}
import tech.tablesaw.api.{ColumnType, Table}
import tech.tablesaw.io.csv.CsvReadOptions

@Singleton
case class Motifs @Inject()(database: Database) {
  private final val table = Motifs.parseMotifFileIntoDataFrame(database.getMotifFile.map(_.getPath))

  private final val metadataLevels = Seq("species", "gene", "mhc.class", "mhc.a", "cid")
  private final val metadata = MotifsMetadata.generateMetadataFromLevels(table, metadataLevels)

  def getTable: Table = table

  def getMetadata: MotifsMetadata = metadata
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

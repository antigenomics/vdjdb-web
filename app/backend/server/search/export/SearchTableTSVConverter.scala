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

package backend.server.search.export

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.database.Database
import backend.server.search.SearchTable
import backend.server.search.api.export.ExportOptionFlag

import scala.concurrent.Future

case class SearchTableTSVConverter()(implicit tfp: TemporaryFileProvider) extends SearchTableConverter {

  override def convert(table: SearchTable, database: Database, options: Seq[ExportOptionFlag]): Future[TemporaryFileLink] = {
    // Rows go straight into the file rather than into a StringBuilder that is then copied into a String:
    // a full database export is a six figure number of rows, and holding the whole document (twice) was
    // the largest single allocation in the application. This also moves the work off the caller's thread,
    // because the writing now happens inside the provider's Future.
    tfp.createTemporaryFileStreamed("SearchTable", getExtension) { content =>
      val rows = table.getRows

      val header = database.getMetadata.columns.map(column => column.title).mkString("complex.id\t", "\t", "\r\n")
      content.write(header)

      rows.foreach(row => content.write(row.entries.mkString(s"${row.metadata.pairedID}\t", "\t", "\r\n")))

      options.foreach(option => {
        option.name match {
          case "paired_export" =>
            if (option.value) {
              val pairedRows = SearchTable.getPairedRows(rows, database)
              pairedRows.foreach(row => content.write(row.entries.mkString(s"${row.metadata.pairedID}\t", "\t", "\r\n")))
            }
          case _ =>
        }
      })
    }
  }

  override def getExtension: String = "tsv"
}

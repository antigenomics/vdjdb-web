/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.server.search.export

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.database.Database
import backend.server.search.SearchTable

import scala.concurrent.Future

case class SearchTableTabDelimitedConverter()(implicit tfp: TemporaryFileProvider) extends SearchTableConverter {

    override def convert(table: SearchTable, database: Database): Future[TemporaryFileLink] = {
        val rows = table.getRows

        val content = new StringBuilder()

        val header = database.getMetadata.columns.map(column => column.title).mkString("complex.id\t", "\t", "\r\n")
        content.append(header)

        rows.foreach(row => content.append(row.entries.mkString(s"${row.metadata.pairedID}\t", "\t", "\r\n")))

//        if (options.exportPaired) {
//            val rowsWithPaired = rows.filter((r) => !(r.metadata.pairedID == "0"))
//            val complexFilter = rowsWithPaired.map(_.metadata.pairedID).mkString(",")
//            val pairedFilterRequest: List[DatabaseFilterRequest] =
//                List(DatabaseFilterRequest("complex.id", DatabaseFilterType.ExactSet, negative = false, complexFilter))
//            val pairedFilters: DatabaseFilters = DatabaseFilters.createFromRequest(pairedFilterRequest, database)
//            val pairedTable: SearchTable = SearchTable()
//            pairedTable.update(pairedFilters, database)
//
//            val pairedRows = pairedTable.getRows.filter(p => !rowsWithPaired.contains(p))
//
//            pairedRows.foreach(row => content.append(row.entries.mkString(s"${row.metadata.pairedID}\t", "\t", "\r\n")))
//        }

        tfp.createTemporaryFile("SearchTable", getExtension, content.toString())
    }

    override def getExtension: String = "txt"
}

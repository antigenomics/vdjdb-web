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

package backend.server.table.search.export

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.database.Database
import backend.server.table.search.SearchTable
import scala.concurrent.Future

case class SearchTableTabDelimitedConverter()(implicit temporaryFileProvider: TemporaryFileProvider) extends SearchTableConverter {

    override def convert(table: SearchTable, database: Database): Future[TemporaryFileLink] = {
        val rows = table.getRows

        val content = new StringBuilder()

        val header = database.getMetadata.columns.map(column => column.title).mkString("", "\t", "\r\n")
        content.append(header)

        rows.foreach(row => content.append(row.entries.mkString("", "\t", "\r\n")))

        temporaryFileProvider.createTemporaryFile("SearchTable", getExtension, content.toString())
    }

    override def getExtension: String = "txt"
}

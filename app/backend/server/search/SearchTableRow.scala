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

package backend.server.search

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.{Json, Format}

case class SearchTableRow(entries: Seq[String], metadata: SearchTableRowMetadata)

object SearchTableRow {
    implicit val searchTableRowFormat: Format[SearchTableRow] = Json.format[SearchTableRow]

    def createFromRow(r: Row): SearchTableRow = {
        val entries = r.getEntries
            .filter(_.getColumn.getMetadata.get("visible") == "1")
            .map(_.getValue)
        val metadata = SearchTableRowMetadata.createFromRow(r)
        SearchTableRow(entries, metadata)
    }
}

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

package backend.server.table.search.api.search

import backend.server.table.search.SearchTableRow
import play.api.libs.json.{Json, Writes}

case class SearchDataResponse(page: Int, pageSize: Int, pageCount: Int, recordsFound: Int, rows: List[SearchTableRow])

object SearchDataResponse {
    final val Action: String = "search"

    implicit val searchTableResultsFilterResponseWrites: Writes[SearchDataResponse] = Json.writes[SearchDataResponse]
}

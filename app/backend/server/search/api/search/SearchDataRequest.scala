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

package backend.server.search.api.search

import backend.server.database.filters.DatabaseFilterRequest
import play.api.libs.json._

case class SearchDataRequest(filters: Option[List[DatabaseFilterRequest]], page: Option[Int], pageSize: Option[Int],
                             sort: Option[String], paired: Option[Boolean], reconnect: Option[Boolean])

object SearchDataRequest {
  implicit val searchTableResultsDataRequestWrites: Writes[SearchDataRequest] = Json.writes[SearchDataRequest]
  implicit val searchTableResultsDataRequestReads: Reads[SearchDataRequest] = (json: JsValue) =>
    JsSuccess(SearchDataRequest(
      (json \ "filters").asOpt[List[DatabaseFilterRequest]],
      (json \ "page").asOpt[Int],
      (json \ "pageSize").asOpt[Int],
      (json \ "sort").asOpt[String],
      (json \ "paired").asOpt[Boolean],
      (json \ "reconnect").asOpt[Boolean]))
}

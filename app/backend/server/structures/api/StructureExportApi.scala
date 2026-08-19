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

package backend.server.structures.api

import play.api.libs.json.{Format, Json}

/** `POST /api/structures/members`: write a cluster's members to a temporary file and hand back a
  * link to it, rather than streaming the rows through the response. */
case class ClusterMembersExportRequest(cid: String, format: String)

object ClusterMembersExportRequest {
  implicit val format: Format[ClusterMembersExportRequest] = Json.format[ClusterMembersExportRequest]
}

case class ClusterMembersExportResponse(link: String)

object ClusterMembersExportResponse {
  implicit val format: Format[ClusterMembersExportResponse] = Json.format[ClusterMembersExportResponse]
}

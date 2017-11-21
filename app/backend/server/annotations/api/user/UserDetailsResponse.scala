/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

package backend.server.annotations.api.user

import backend.models.authorization.permissions.UserPermissions
import backend.models.authorization.user.UserDetails
import backend.models.files.sample.SampleFile
import play.api.libs.json.{Json, Writes}

case class UserDetailsResponse(details: UserDetails)

object UserDetailsResponse {
    final val Action: String = "details"

    implicit val sampleFileWrites: Writes[SampleFile] = Json.writes[SampleFile]
    implicit val userPermissionsWrites: Writes[UserPermissions] = Json.writes[UserPermissions]
    implicit val userDetailWrites: Writes[UserDetails] = Json.writes[UserDetails]
    implicit val userDetailsResponseWrites: Writes[UserDetailsResponse] = Json.writes[UserDetailsResponse]
}

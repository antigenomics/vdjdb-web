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
 */

package backend.models.authorization.user

import backend.models.authorization.permissions.UserPermissions
import backend.models.files.sample.SampleFileDetails
import backend.models.files.sample.tags.SampleTagDetails

case class UserDetails(email: String, login: String, files: Seq[SampleFileDetails], tags: Seq[SampleTagDetails], permissions: UserPermissions)
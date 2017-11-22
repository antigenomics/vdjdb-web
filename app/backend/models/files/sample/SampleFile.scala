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

package backend.models.files.sample

import backend.models.authorization.user.{User, UserProvider}
import backend.models.files.{FileMetadata, FileMetadataProvider}

import scala.concurrent.{ExecutionContext, Future}

case class SampleFile(id: Long, sampleName: String, metadataID: Long, userID: Long) {
    def getMetadata(implicit fmp: FileMetadataProvider, ec: ExecutionContext): Future[FileMetadata] = {
        fmp.get(metadataID).map(_.get)
    }

    def getUser(implicit up: UserProvider, ec: ExecutionContext): Future[User] = {
        up.get(userID).map(_.get)
    }
}

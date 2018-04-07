/*
 *      Copyright 2017 Bagaev Dmitry
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

package backend.models.files.temporary

import play.api.libs.json.{Json, Format}

case class TemporaryFileLink(link: String) {
    def getDownloadLink: String = s"/temporary/$link"
}

object TemporaryFileLink {
    implicit val temporaryFileLinkFormat: Format[TemporaryFileLink] = Json.format[TemporaryFileLink]

    def unpackDownloadLink(downloadLink: String): String = downloadLink.split("/")(2)
}

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

package backend.models.files

import java.io.File
import java.sql.Timestamp

case class FileMetadata(id: Long, fileName: String, extension: String, path: String,
                        folder: String, createdAt: Timestamp = new Timestamp(new java.util.Date().getTime)) {

    def getNameWithExtension: String = s"$fileName.$extension"

    def getNameWithDateAndExtension: String = s"$fileName-$createdAt.$extension"

    private[files] def deleteFile(): Unit = {
        val directory = new File(folder)
        val file = new File(path)

        if (file.exists()) {
            file.delete()
        }
        if (directory.exists()) {
            directory.delete()
        }
    }
}

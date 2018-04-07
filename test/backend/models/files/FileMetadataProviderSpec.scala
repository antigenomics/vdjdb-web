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

package backend.models.files

import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}
import org.scalatest.Succeeded

import scala.async.Async.{async, await}

class FileMetadataProviderSpec extends DatabaseProviderTestSpec {
    lazy implicit val fmp: FileMetadataProvider = app.injector.instanceOf[FileMetadataProvider]

    "FileMetadataProvider" should {

        "have proper table name"  taggedAs SQLDatabaseTestTag in {
            fmp.getTable.baseTableRow.tableName shouldEqual FileMetadataTable.TABLE_NAME
        }

        "get empty list" taggedAs SQLDatabaseTestTag in {
            fmp.getAll.flatMap { files =>
                files shouldBe empty
            }
        }

        "be able to insert and delete metadata entry" taggedAs SQLDatabaseTestTag in {
            async {
                val id = await(fmp.insert(FileMetadata(0, "name", "extension", "/tmp/name.extension", "/tmp")))
                id should not be (0)

                val metadata = await(fmp.get(id))
                metadata should not be empty
                metadata.get.id shouldEqual id
                metadata.get.fileName shouldEqual "name"
                metadata.get.extension shouldEqual "extension"
                metadata.get.path shouldEqual "/tmp/name.extension"
                metadata.get.folder shouldEqual "/tmp"

                await(fmp.getAll) should have size 1

                val nonexistentDeleted = await(fmp.delete(-1))
                nonexistentDeleted shouldEqual 0

                val existentDeleted = await(fmp.delete(id))
                existentDeleted shouldEqual 1

                await(fmp.getAll) should have size 0
            }
        }
    }
}

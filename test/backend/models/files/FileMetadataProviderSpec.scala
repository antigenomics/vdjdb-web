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

        "not report an entry that was never inserted" taggedAs SQLDatabaseTestTag in {
            // Was "get empty list", asserting FILE_METADATA is globally empty. Every suite shares one
            // H2 database - `databaseName` selects the Play datasource, it does not isolate anything -
            // so that assertion held only for as long as no other spec inserted a row, and it broke
            // the moment SampleRetentionProviderSpec started storing samples. Asserting about a row
            // this suite owns is order-independent; asserting a shared table is empty never can be.
            fmp.get(-1).map { missing =>
                missing shouldBe empty
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

                // Counted relative to whatever other suites have left in the shared table, rather
                // than against an absolute size - see the note on the previous test.
                val before = await(fmp.getAll).size
                before should be >= 1
                await(fmp.getAll).map(_.id) should contain(id)

                val nonexistentDeleted = await(fmp.delete(-1))
                nonexistentDeleted shouldEqual 0

                val existentDeleted = await(fmp.delete(id))
                existentDeleted shouldEqual 1

                val after = await(fmp.getAll)
                after should have size (before - 1).toLong
                after.map(_.id) should not contain id
            }
        }
    }
}

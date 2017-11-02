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

package backend.models.files

import java.io.File
import java.sql.Timestamp
import java.util.Date

import backend.models.files.temporary.TemporaryFileProvider
import backend.models.{DatabaseProviderTestSpec, DatabaseTestTag}

import scala.io.Source
import scala.async.Async.{async, await}


class TemporaryFileProviderSpec extends DatabaseProviderTestSpec {
    lazy implicit val temporaryFileProvider: TemporaryFileProvider = app.injector.instanceOf[TemporaryFileProvider]
    lazy implicit val fileMetadataProvider: FileMetadataProvider = app.injector.instanceOf[FileMetadataProvider]

    "TemporaryFileProvider" should {

        "get empty list" taggedAs DatabaseTestTag in {
            async {
                val files = await(temporaryFileProvider.getAll)
                files shouldBe empty
            }
        }

        "be able to create temporary file" taggedAs DatabaseTestTag in {
            async {
                val link = await(temporaryFileProvider.createTemporaryFile("test-file", "txt", "HelloWorld")).link
                val tmpDirectoryPath = temporaryFileProvider.getTemporaryFilesDirectoryPath
                val tmpDirectory = new File(tmpDirectoryPath)
                tmpDirectory should exist
                tmpDirectory should be a 'directory

                val tmpFileDirectoryPath = s"$tmpDirectoryPath/$link"
                val tmpFileDirectory = new File(tmpFileDirectoryPath)
                tmpFileDirectory should exist
                tmpFileDirectory should be a 'directory

                val fileWithMetadata = await(temporaryFileProvider.getWithMetadata(link))
                fileWithMetadata should not be empty

                val file = fileWithMetadata.get._1
                val metadata = fileWithMetadata.get._2
                file.link shouldEqual link
                file.metadataID shouldEqual metadata.id
                file.expiredAt.after(metadata.createdAt) shouldBe true

                metadata.folder shouldEqual tmpFileDirectoryPath
                metadata.createdAt.before(new Date()) shouldBe true
                metadata.extension shouldEqual "txt"
                metadata.fileName shouldEqual "test-file"
                metadata.getNameWithExtension shouldEqual "test-file.txt"
                metadata.getNameWithDateAndExtension shouldEqual s"test-file-${metadata.createdAt}.txt"

                val fileAbsolutePath = s"$tmpFileDirectoryPath/${metadata.fileName}.${metadata.extension}"
                metadata.path shouldEqual fileAbsolutePath

                val createdFile = new File(fileAbsolutePath)
                createdFile should exist
                createdFile should be a 'file

                val lines = Source.fromFile(fileAbsolutePath).mkString
                lines shouldEqual "HelloWorld"
            }
        }

        "get non-empty list" taggedAs DatabaseTestTag in {
            async {
                val files = await(temporaryFileProvider.getAll)
                files should not be empty
                files.size shouldEqual 1
            }
        }

        "be able to delete temporary files" taggedAs DatabaseTestTag in {
            async {
                val files = await(temporaryFileProvider.getAllWithMetadata)
                files.map { case (file, metadata) => async {
                    val deleteCount = await(temporaryFileProvider.deleteTemporaryFile(file))
                    deleteCount shouldEqual 1

                    val deletedFile = new File(metadata.path)
                    deletedFile should not(exist)

                    val deletedFileDirectory = new File(metadata.folder)
                    deletedFileDirectory should not(exist)

                    val tmpDirectoryPath = temporaryFileProvider.getTemporaryFilesDirectoryPath
                    val tmpDirectory = new File(tmpDirectoryPath)
                    tmpDirectory should exist
                    tmpDirectory should be a 'directory

                    await(temporaryFileProvider.get(file.link)) shouldBe empty
                    await(fileMetadataProvider.get(metadata.id)) shouldBe empty
                }}.assertAllAndAwait
            }
        }

        "be able to delete expired files" taggedAs DatabaseTestTag in {
            async {
                val fakeExpiredAt = new Timestamp(new java.util.Date().getTime - 1)
                val link = await(temporaryFileProvider.createTemporaryFile("test", "txt", "Hello", fakeExpiredAt)).link
                await(temporaryFileProvider.deleteExpired()) shouldBe 1
                await(temporaryFileProvider.get(link)) shouldBe empty
            }
        }

        "be able to delete all files" taggedAs DatabaseTestTag in {
            async {
                val file1Link = await(temporaryFileProvider.createTemporaryFile("test1", "txt", "Hello")).link
                val file2Link = await(temporaryFileProvider.createTemporaryFile("test2", "txt", "World")).link
                val file3Link = await(temporaryFileProvider.createTemporaryFile("test3", "txt", "!")).link

                val files = await(temporaryFileProvider.getAll)
                files should have size 3

                val fileLinks = files.map(_.link)
                fileLinks should contain(file1Link)
                fileLinks should contain(file2Link)
                fileLinks should contain(file3Link)

                val deleteCount = await(temporaryFileProvider.deleteAll())
                deleteCount shouldEqual 3

                fileLinks.map(link => async {
                    await(temporaryFileProvider.get(link)) shouldBe empty
                }).assertAllAndAwait
            }
        }

        "throw an exception when trying to delete a nonexistent file" taggedAs DatabaseTestTag in {
            async {
                val exception = await(recoverToExceptionIf[Exception] {
                    temporaryFileProvider.deleteTemporaryFile("invalid link")
                })
                exception.getMessage shouldEqual "No such temporary file"
            }
        }
    }

    override protected def afterAll(): Unit = {
        temporaryFileProvider.deleteAll()
    }
}

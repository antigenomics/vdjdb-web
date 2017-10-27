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

package models.files

import java.io.File
import java.sql.Timestamp
import java.util.Date

import backend.models.files.FileMetadataProvider
import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import models.{DatabaseProviderTestSpec, DatabaseTestTag}

import scala.io.Source


class TemporaryFileProviderSpec extends DatabaseProviderTestSpec {
    lazy implicit val temporaryFileProvider: TemporaryFileProvider = app.injector.instanceOf[TemporaryFileProvider]
    lazy implicit val fileMetadataProvider: FileMetadataProvider = app.injector.instanceOf[FileMetadataProvider]

    "TemporaryFileProvider" should {

        "get empty list" taggedAs DatabaseTestTag in {
            temporaryFileProvider.getAll map { files =>
                files shouldBe empty
            }
        }

        "be able to create temporary file" taggedAs DatabaseTestTag in {
            temporaryFileProvider.createTemporaryFile("test-file", "txt", "HelloWorld") flatMap { case TemporaryFileLink(link) =>
                val tmpDirectoryPath = temporaryFileProvider.getTemporaryFilesDirectoryPath
                val tmpDirectory = new File(tmpDirectoryPath)
                tmpDirectory should exist
                tmpDirectory should be a 'directory

                val tmpFileDirectoryPath = s"$tmpDirectoryPath/$link"
                val tmpFileDirectory = new File(tmpFileDirectoryPath)
                tmpFileDirectory should exist
                tmpFileDirectory should be a 'directory

                temporaryFileProvider.getWithMetadata(link) flatMap {
                    case Some((file, metadata)) =>
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
                    case None =>
                        fail("Cannot get created temporary file")
                }
            }
        }

        "get non-empty list" taggedAs DatabaseTestTag in {
            temporaryFileProvider.getAll map { files =>
                files should not be empty
                files.size shouldEqual 1
            }
        }

        "be able to delete temporary files" taggedAs DatabaseTestTag in {
            temporaryFileProvider.getAllWithMetadata flatMap { files =>
                files.map(f => {
                    val file = f._1
                    val metadata = f._2

                    temporaryFileProvider.deleteTemporaryFile(file) flatMap { deleteCount =>
                        deleteCount shouldEqual 1

                        val deletedFile = new File(metadata.path)
                        deletedFile should not(exist)

                        val deletedFileDirectory = new File(metadata.folder)
                        deletedFileDirectory should not(exist)

                        val tmpDirectoryPath = temporaryFileProvider.getTemporaryFilesDirectoryPath
                        val tmpDirectory = new File(tmpDirectoryPath)
                        tmpDirectory should exist
                        tmpDirectory should be a 'directory

                        val f1 = temporaryFileProvider.get(file.link) map { _ shouldEqual None }
                        val f2 = fileMetadataProvider.get(metadata.id) map { _ shouldEqual None }

                        Seq(f1, f2).collectFutures
                    }
                }).collectFutures
            }
        }

        "be able to delete expired files" taggedAs DatabaseTestTag in {
            val fakeExpiredAt = new Timestamp(new java.util.Date().getTime - 1)
            temporaryFileProvider.createTemporaryFile("test", "txt", "Hello", fakeExpiredAt) flatMap { case TemporaryFileLink(link) =>
                temporaryFileProvider.deleteExpired() flatMap { _ =>
                    temporaryFileProvider.get(link) flatMap { file =>
                        file shouldEqual None
                    }
                }
            }
        }

        "be able to delete all files" taggedAs DatabaseTestTag in {
            val file1 = temporaryFileProvider.createTemporaryFile("test1", "txt", "Hello")
            val file2 = temporaryFileProvider.createTemporaryFile("test2", "txt", "World")
            val file3 = temporaryFileProvider.createTemporaryFile("test3", "txt", "!")
            val files = for {
                f1 <- file1
                f2 <- file2
                f3 <- file3
            } yield (f1, f2, f3)

            files flatMap { links =>
                temporaryFileProvider.getAll flatMap { files =>
                    files.size shouldEqual 3

                    val fileLinks = files.map(_.link)

                    fileLinks should contain (links._1.link)
                    fileLinks should contain (links._2.link)
                    fileLinks should contain (links._3.link)

                    temporaryFileProvider.deleteAll() flatMap { deleteCount =>
                        deleteCount shouldEqual 3

                        val checkFile1 = temporaryFileProvider.get(files.head.link) map { _ shouldEqual None }
                        val checkFile2 = temporaryFileProvider.get(files(1).link) map { _ shouldEqual None }
                        val checkFile3 = temporaryFileProvider.get(files(2).link) map { _ shouldEqual None }

                        Seq(checkFile1, checkFile2, checkFile3).collectFutures
                    }
                }
            }
        }

        "throw an exception when trying to delete a nonexistent file" taggedAs DatabaseTestTag in {
            for {
                exception <- recoverToExceptionIf[Exception] {
                    temporaryFileProvider.deleteTemporaryFile("invalid link")
                }
                assertion <- exception.getMessage shouldEqual "No such temporary file"
            } yield assertion
        }
    }


    override protected def beforeAll(): Unit = {
        temporaryFileProvider.cancelDeleteScheduler()
    }

    override protected def afterAll(): Unit = {
        temporaryFileProvider.deleteAll()
    }
}

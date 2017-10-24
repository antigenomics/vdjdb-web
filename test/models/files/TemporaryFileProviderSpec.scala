package models.files

import java.io.File

import backend.models.files.FileMetadataProvider
import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import org.scalatest.BeforeAndAfterAll
import org.scalatest.concurrent.ScalaFutures
import org.scalatestplus.play._
import play.api.{Application, Mode}
import play.api.db.{DBApi, Database}
import play.api.inject.guice.GuiceApplicationBuilder


class TemporaryFileProviderSpec extends PlaySpec with BeforeAndAfterAll with ScalaFutures {
    lazy implicit val app: Application = new GuiceApplicationBuilder().in(Mode.Test).build()
    lazy implicit val database: Database = app.injector.instanceOf[DBApi].database("default")
    lazy implicit val temporaryFileProvider: TemporaryFileProvider = app.injector.instanceOf[TemporaryFileProvider]
    lazy implicit val fileMetadataProvider: FileMetadataProvider = app.injector.instanceOf[FileMetadataProvider]

    "TemporaryFileProvider" must {

        "get empty list" in {
            whenReady(temporaryFileProvider.getAll) { files =>
                files mustBe empty
            }
        }

        "create temporary file" in {
            whenReady(temporaryFileProvider.createTemporaryFile("test-file", "txt", "HelloWorld")) { case TemporaryFileLink(link) =>
                val tmpDirectoryPath = temporaryFileProvider.getTemporaryFilesDirectoryPath
                val tmpDirectory = new File(tmpDirectoryPath)
                tmpDirectory must exist

                val tmpFileDirectoryPath = s"$tmpDirectoryPath/$link"
                val tmpFileDirectory = new File(tmpFileDirectoryPath)
                tmpFileDirectory must exist
                
                whenReady(temporaryFileProvider.getTemporaryFileWithMetadata(link)) {
                    case Some((file, metadata)) =>
                        file.link mustEqual link
                        metadata.folder mustEqual tmpFileDirectoryPath
                    case None =>
                        fail("Cannot get created temporary file")
                }
            }
        }

    }


    override protected def beforeAll(): Unit = {
        temporaryFileProvider.cancelDeleteScheduler()
    }

    override protected def afterAll(): Unit = {
        temporaryFileProvider.deleteAll()
    }
}

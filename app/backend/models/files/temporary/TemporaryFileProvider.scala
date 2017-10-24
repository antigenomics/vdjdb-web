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

import java.io.{File, PrintWriter}
import java.text.SimpleDateFormat
import java.sql.Date
import javax.inject.{Inject, Singleton}

import akka.actor.ActorSystem
import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.utils.CommonUtils
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._
import scala.language.postfixOps
import scala.util.Failure

@Singleton
class TemporaryFileProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider, fileMetadataProvider: FileMetadataProvider)
                                    (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem) extends HasDatabaseConfigProvider[JdbcProfile] {
    private val logger = LoggerFactory.getLogger(this.getClass)
    private final val configuration = conf.get[TemporaryFileConfiguration]("application.temporary")
    import dbConfig.profile.api._
    private final val scheduler = system.scheduler.schedule(configuration.interval seconds, configuration.interval seconds) {
        deleteExpired onComplete {
            case Failure(ex) =>
                logger.error("Cannot delete temporary files", ex)
            case _ =>
        }
    }

    def getTemporaryFilesDirectoryPath: String = configuration.path

    def getTemporaryFilesKeep: Int = configuration.keep

    def getTemporaryFilesDeleteInterval: Int = configuration.interval

    def cancelDeleteScheduler(): Unit = scheduler.cancel()

    def getAll: Future[Seq[TemporaryFile]] = {
        db.run(TemporaryFileProvider.table.result)
    }

    def deleteExpired(): Future[Int] = {
        val currentDate = new Date(new java.util.Date().getTime)
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.expiredAt < currentDate).result).flatMap { files =>
            files.foreach {
                case (_, metadata) => metadata.deleteFile()
            }
            db.run(TemporaryFileProvider.table.filter(_.expiredAt < currentDate).delete)
        }
    }

    def deleteAll(): Future[Int] = {
        db.run(TemporaryFileProvider.table.withMetadata.result) flatMap { files =>
            files.foreach {
                case (_, metadata) => metadata.deleteFile()
            }
            db.run(TemporaryFileProvider.table.delete)
        }
    }

    def getTemporaryFile(link: String): Future[Option[TemporaryFile]] = {
        db.run(TemporaryFileProvider.table.filter(_.link === link).result.headOption)
    }

    def getTemporaryFileWithMetadata(link: String): Future[Option[(TemporaryFile, FileMetadata)]] = {
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.link === link).result.headOption)
    }

    def deleteTemporaryFile(link: String): Future[Int] = {
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.link === link).result.headOption).flatMap { file =>
            if (file.nonEmpty) {
                file.get._2.deleteFile()
                db.run(TemporaryFileProvider.table.filter(_.link === link).delete)
            } else {
                Future.successful(0)
            }
        }
    }

    def deleteTemporaryFile(file: TemporaryFile): Future[Int] = {
        deleteTemporaryFile(file.link)
    }

    def createTemporaryFile(name: String, extension: String, content: String): Future[TemporaryFileLink] = {
        val link = CommonUtils.randomAlphaNumericString(32)
        val folderPath = s"${configuration.path}/$link"

        val folder = new File(folderPath)
        if (folder.mkdirs()) {
            val dateFormat: SimpleDateFormat = new SimpleDateFormat("HH:mm-dd-MM-yyyy")
            val currentDate = new java.util.Date()
            val currentDateString: String = dateFormat.format(currentDate)
            val fileName = s"${name}_$currentDateString"
            val filePath = s"$folderPath/$fileName.$extension"

            val contentFile = new File(filePath)
            contentFile.createNewFile()
            val printWriter = new PrintWriter(contentFile)
            printWriter.write(content)
            printWriter.close()

            val expiredAt = new Date(currentDate.getTime + configuration.keep * 1000)
            for (
                meta <- fileMetadataProvider.insert(fileName, extension, folderPath);
                _ <- insert(link, expiredAt, meta)
            ) yield TemporaryFileLink(link)
        } else {
            Future.failed(new Exception(s"Cannot create temporary file in ${configuration.path}"))
        }
    }

    private def insert(link: String, expiredAt: Date, metadataID: Long): Future[Int] = {
        db.run(TemporaryFileProvider.table += TemporaryFile(0, link, expiredAt, metadataID))
    }
}

object TemporaryFileProvider {
    private[files] final val table = TableQuery[TemporaryFileTable]
}
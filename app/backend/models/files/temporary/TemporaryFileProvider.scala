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
import java.sql.Timestamp
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

    if (configuration.interval != 0) {
        system.scheduler.schedule(configuration.interval seconds, configuration.interval seconds) {
            deleteExpired onComplete {
                case Failure(ex) =>
                    logger.error("Cannot delete temporary files", ex)
                case _ =>
            }
        }
    }

    def getTemporaryFilesDirectoryPath: String = configuration.path

    def getTemporaryFilesKeep: Int = configuration.keep

    def getTemporaryFilesDeleteInterval: Int = configuration.interval

    def getAll: Future[Seq[TemporaryFile]] = {
        db.run(TemporaryFileProvider.table.result)
    }

    def getAllWithMetadata: Future[Seq[(TemporaryFile, FileMetadata)]] = {
        db.run(TemporaryFileProvider.table.withMetadata.result)
    }

    def deleteExpired(): Future[Int] = {
        val currentDate = new Timestamp(new java.util.Date().getTime)
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.expiredAt < currentDate).result).flatMap { files =>
            fileMetadataProvider.delete(files.map(_._2))
        }
    }

    def deleteAll(): Future[Int] = {
        db.run(TemporaryFileProvider.table.withMetadata.result) flatMap { files =>
            fileMetadataProvider.delete(files.map(_._2))
        }
    }

    def get(link: String): Future[Option[TemporaryFile]] = {
        db.run(TemporaryFileProvider.table.filter(_.link === link).result.headOption)
    }

    def getWithMetadata(link: String): Future[Option[(TemporaryFile, FileMetadata)]] = {
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.link === link).result.headOption)
    }

    def deleteTemporaryFile(link: String): Future[Int] = {
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.link === link).result.headOption) flatMap {
            case Some(file) => fileMetadataProvider.delete(file._2)
            case None => Future.failed(new Exception("No such temporary file"))
        }
    }

    def deleteTemporaryFile(file: TemporaryFile): Future[Int] = {
        deleteTemporaryFile(file.link)
    }

    def createTemporaryFile(name: String, extension: String, content: String,
                            expiredAt: Timestamp = new Timestamp(new java.util.Date().getTime + configuration.keep * 1000)): Future[TemporaryFileLink] = {
        val link = CommonUtils.randomAlphaNumericString(32)
        val folderPath = s"${configuration.path}/$link"

        val folder = new File(folderPath)
        if (folder.mkdirs()) {
            val filePath = s"$folderPath/$name.$extension"

            val contentFile = new File(filePath)
            contentFile.createNewFile()
            val printWriter = new PrintWriter(contentFile)
            printWriter.write(content)
            printWriter.close()

            fileMetadataProvider.insert(name, extension, folderPath) flatMap { metadataID =>
                insert(link, expiredAt, metadataID)
            } flatMap  { _ =>
                Future.successful(TemporaryFileLink(link))
            }
        } else {
            Future.failed(new Exception(s"Cannot create temporary file in ${configuration.path}"))
        }
    }

    private def insert(link: String, expiredAt: Timestamp, metadataID: Long): Future[Int] = {
        db.run(TemporaryFileProvider.table += TemporaryFile(0, link, expiredAt, metadataID))
    }
}

object TemporaryFileProvider {
    private[files] final val table = TableQuery[TemporaryFileTable]
}
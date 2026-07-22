/*
 *     Copyright 2017-2019 Bagaev Dmitry
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

package backend.models.files.temporary

import java.io.{BufferedWriter, File, FileOutputStream, OutputStreamWriter, Writer}
import java.nio.charset.StandardCharsets
import java.sql.Timestamp
import java.time.Duration

import akka.actor.{ActorSystem, Cancellable}
import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.utils.files.FileUtils
import backend.utils.{CommonUtils, TimeUtils}
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.inject.ApplicationLifecycle
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.jdbc.meta.MTable

import scala.async.Async.{async, await}
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.postfixOps
import scala.util.Failure
import scala.util.control.NonFatal

@Singleton
class TemporaryFileProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider, lifecycle: ApplicationLifecycle)
                                     (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem, fmp: FileMetadataProvider)
  extends HasDatabaseConfigProvider[JdbcProfile] {
  private final val logger = LoggerFactory.getLogger(this.getClass)
  private final val configuration = conf.get[TemporaryFileConfiguration]("application.temporary")

  import dbConfig.profile.api._

  private final val table = TableQuery[TemporaryFileTable]

  private final val deleteScheduler: Option[Cancellable] = Option(configuration.interval.getSeconds != 0).collect {
    case true => system.scheduler.schedule(configuration.interval.getSeconds seconds, configuration.interval.getSeconds seconds) {
      deleteExpired onComplete {
        case Failure(ex) =>
          logger.warn("Cannot delete expired temporary files", ex)
        case _ =>
      }
    }
  }

  lifecycle.addStopHook { () => Future.successful(deleteScheduler.foreach(_.cancel())) }

  def getTable: TableQuery[TemporaryFileTable] = table

  def getTemporaryFilesDirectoryPath: String = configuration.path

  def getTemporaryFilesKeep: Duration = configuration.keep

  def getTemporaryFilesDeleteInterval: Duration = configuration.interval

  def getAll: Future[Seq[TemporaryFile]] = {
    db.run(table.result)
  }

  def getAllWithMetadata: Future[Seq[(TemporaryFile, FileMetadata)]] = {
    db.run(table.withMetadata.result)
  }

  def deleteExpired(): Future[Int] = {
    db.run(MTable.getTables).flatMap(tables => async {
      if (tables.exists(_.name.name == TemporaryFileTable.TABLE_NAME)) {
        val currentDate = new Timestamp(new java.util.Date().getTime)
        val files = await(db.run(table.withMetadata.filter(_._1.expiredAt < currentDate).result))
        await(fmp.delete(files.map(_._2)))
      } else {
        0
      }
    })
  }

  def deleteAll(): Future[Int] = async {
    val files = await(db.run(table.withMetadata.result))
    await(fmp.delete(files.map(_._2)))
  }

  def get(link: String): Future[Option[TemporaryFile]] = {
    db.run(table.filter(_.link === link).result.headOption)
  }

  def getWithMetadata(link: String): Future[Option[(TemporaryFile, FileMetadata)]] = {
    db.run(table.withMetadata.filter(_._1.link === link).result.headOption)
  }

  def deleteTemporaryFile(link: String): Future[Int] = {
    db.run(table.withMetadata.filter(_._1.link === link).result.headOption) flatMap {
      case Some(file) => fmp.delete(file._2)
      case None => Future.failed(new Exception("No such temporary file"))
    }
  }

  def deleteTemporaryFile(file: TemporaryFile): Future[Int] = {
    deleteTemporaryFile(file.link)
  }

  def createTemporaryFile(name: String, extension: String, content: String,
                          expiredAt: Timestamp = TimeUtils.getExpiredAt(configuration.keep)): Future[TemporaryFileLink] = {
    createTemporaryFileStreamed(name, extension, expiredAt)(_.write(content))
  }

  // Table exports run into hundreds of megabytes, and handing them over as a finished String means the
  // caller holds the whole document (a builder plus its toString copy) before we even open the file.
  // Callers that produce their content row by row take this method instead and write straight into the
  // file, so nothing bigger than a single row is ever live.
  def createTemporaryFileStreamed(name: String, extension: String,
                                  expiredAt: Timestamp = TimeUtils.getExpiredAt(configuration.keep))
                                 (writeContent: Writer => Unit): Future[TemporaryFileLink] = async {
    val link = CommonUtils.randomAlphaNumericString(32)
    val folderPath = s"${configuration.path}/$link"

    val folder = new File(folderPath)
    if (folder.mkdirs()) {
      val filePath = s"$folderPath/$name.$extension"

      val contentFile = new File(filePath)
      writeToFile(contentFile, writeContent)

      val _ = await(insert(name, extension, folderPath, link, expiredAt))
      TemporaryFileLink(link)
    } else {
      throw new Exception(s"Cannot create temporary file in ${configuration.path}")
    }
  }

  // Kept out of the async block above because the async macro does not accept a try in every position.
  private def writeToFile(contentFile: File, writeContent: Writer => Unit): Unit = {
    contentFile.createNewFile()
    // The charset is pinned instead of taken from the platform default, so that a server started without
    // a UTF-8 locale still writes the same bytes as everywhere else.
    val writer = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(contentFile), StandardCharsets.UTF_8))
    try {
      writeContent(writer)
    } catch {
      // The row is only inserted once the write returns, and `deleteExpired` reaps from that table - so
      // a half-written export that throws would otherwise sit in the temporary directory with nothing
      // that knows it is there. The old PrintWriter never reached this path because it swallowed
      // IOException and registered the truncated file instead, which is worse but at least collectable.
      case NonFatal(ex) =>
        writer.close()
        val folder = contentFile.getParentFile
        logger.warn(s"Removing '${folder.getPath}' after a failed write", ex)
        FileUtils.deleteRecursively(folder)
        throw ex
    } finally {
      writer.close()
    }
  }

  private def insert(name: String, extension: String, folderPath: String, link: String, expiredAt: Timestamp): Future[Int] = {
    fmp.insert(name, extension, folderPath).flatMap(insert(link, expiredAt, _))
  }

  private def insert(link: String, expiredAt: Timestamp, metadataID: Long): Future[Int] = {
    db.run(table += TemporaryFile(0, link, expiredAt, metadataID))
  }
}
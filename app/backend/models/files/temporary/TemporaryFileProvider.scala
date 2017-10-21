package backend.models.files.temporary

import javax.inject.{Inject, Singleton}

import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.utils.CommonUtils
import backend.utils.files.{FileUtils, TemporaryConfiguration}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class TemporaryFileProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider, fileMetadataProvider: FileMetadataProvider)
                                    (implicit ec: ExecutionContext, configuration: TemporaryConfiguration) extends HasDatabaseConfigProvider[JdbcProfile] {
    import dbConfig.profile.api._

    def getAll: Future[Seq[TemporaryFile]] = {
        db.run(TemporaryFileProvider.table.result)
    }

    def getTemporaryFile(link: String): Future[Option[TemporaryFile]] = {
        db.run(TemporaryFileProvider.table.filter(_.link === link).result.headOption)
    }

    def getTemporaryFileWithMetadata(link: String): Future[Option[(TemporaryFile, FileMetadata)]] = {
        db.run(TemporaryFileProvider.table.withMetadata.filter(_._1.link === link).result.headOption)
    }

    def deleteTemporaryFile(link: String): Future[Int] = {
        db.run(TemporaryFileProvider.table.filter(_.link === link).delete)
    }

    def createTemporaryFile(name: String, content: String): Future[String] = {
        val link = CommonUtils.randomAlphaNumericString(32)
        val folder = configuration.path + "/" + link + "/"

        FileUtils.createDirectory(folder)
    }
}

object TemporaryFileProvider {
    private[files] final val table = TableQuery[TemporaryFileTable]
}
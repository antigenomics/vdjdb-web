package backend.models.files.temporary

import javax.inject.{Inject, Singleton}

import backend.models.files.{FileMetadataLink, FileMetadataProvider}
import backend.utils.files.TemporaryConfiguration
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

    def getTemporaryFile(link: FileMetadataLink): Future[Option[TemporaryFile]] = {
        for {
            meta <- fileMetadataProvider.getFileMetadata(link)
            if meta.nonEmpty
            file <- db.run(TemporaryFileProvider.table.filter(_.metadataID === meta.get.id).result.headOption)
        } yield file
    }

}

object TemporaryFileProvider {
    private final val table = TableQuery[TemporaryFileTable]
}
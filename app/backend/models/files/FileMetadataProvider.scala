package backend.models.files

import javax.inject.{Inject, Singleton}

import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class FileMetadataProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                            (implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {
    import dbConfig.profile.api._

    def getAll: Future[Seq[FileMetadata]] = {
        db.run(FileMetadataProvider.table.result)
    }

    def getFileMetadata(link: FileMetadataLink): Future[Option[FileMetadata]] = {
        db.run(FileMetadataProvider.table.filter(meta => meta.hash === link.hash && meta.guard === link.guard).result.headOption)
    }
}

object FileMetadataProvider {
    private[files] final val table = TableQuery[FileMetadataTable]
}

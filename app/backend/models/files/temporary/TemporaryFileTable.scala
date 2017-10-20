package backend.models.files.temporary

import java.sql.Date

import backend.models.files.FileMetadataProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag
import scala.language.higherKinds

class TemporaryFileTable(tag: Tag) extends Table[TemporaryFile](tag, "TEMPORARY_FILE") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def locked = column[Boolean]("LOCKED")
    def expiredAt = column[Date]("EXPIRED_AT")
    def metadataID = column[Long]("METADATA_ID")

    def * = (id, locked, expiredAt, metadataID) <> (TemporaryFile.tupled, TemporaryFile.unapply)
    def metadata = foreignKey("METADATA_FK", metadataID, FileMetadataProvider.table)(_.id)
}

object TemporaryFileTable {
    implicit class TemporaryFileExtension[C[_]](q: Query[TemporaryFileTable, TemporaryFile, C]) {
        def withMetadata = q.join(FileMetadataProvider.table).on(_.metadataID === _.id)
    }
}

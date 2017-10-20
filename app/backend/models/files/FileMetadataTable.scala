package backend.models.files

import java.sql.Date

import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

class FileMetadataTable(tag: Tag) extends Table[FileMetadata](tag, "FILE_METADATA") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def fileName = column[String]("FILE_NAME")
    def path = column[String]("PATH")
    def folder = column[String]("FOLDER")
    def guard = column[String]("GUARD")
    def hash = column[String]("HASH")
    def createdAt = column[Date]("CREATED_AT")

    def * = (id, fileName, path, folder, guard, hash, createdAt) <> (FileMetadata.tupled, FileMetadata.unapply)
}

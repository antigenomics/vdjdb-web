package backend.models.files

import java.sql.Date

import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

class FileMetadataTable(tag: Tag) extends Table[FileMetadata](tag, "FILE_METADATA") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def fileName = column[String]("FILE_NAME", O.Length(128))
    def extension = column[String]("EXTENSION", O.Length(16))
    def path = column[String]("PATH", O.Length(512))
    def folder = column[String]("FOLDER", O.Length(512))
    def createdAt = column[Date]("CREATED_AT")

    def * = (id, fileName, extension, path, folder, createdAt) <> (FileMetadata.tupled, FileMetadata.unapply)
}

package backend.models.files

import java.sql.Date

case class FileMetadata(id: Long, fileName: String, extension: String, path: String, folder: String, createdAt: Date = new Date(new java.util.Date().getTime))

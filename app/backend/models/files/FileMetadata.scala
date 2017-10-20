package backend.models.files

import java.sql.Date

case class FileMetadata(id: Long, fileName: String, path: String, folder: String,
                        guard: String, hash: String, createdAt: Date = new Date(new java.util.Date().getTime)) {
    def getMetadataLink: FileMetadataLink = FileMetadataLink(guard, hash)
}

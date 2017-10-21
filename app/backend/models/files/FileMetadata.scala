package backend.models.files

import java.io.File
import java.sql.Date

case class FileMetadata(id: Long, fileName: String, extension: String, path: String, folder: String, createdAt: Date = new Date(new java.util.Date().getTime)) {
    def deleteFile(): Unit = {
        val directory = new File(folder)
        val file = new File(path)

        if (file.exists()) {
            file.delete()
        }
        if (directory.exists()) {
            directory.delete()
        }
    }
}

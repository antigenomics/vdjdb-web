package backend.utils.files

import java.io.{File, PrintWriter}
import java.text.SimpleDateFormat
import java.util.Date

import backend.utils.CommonUtils
import play.api.libs.json.{Json, OWrites}

import scala.io.Source

case class TemporaryFile(name: String, path: String, guard: String, hash: String) {

    def validate(): Boolean = {
        val invalidPath: Boolean = path.contains("..") || name.contains("..")

        if (!invalidPath) {
            val folderPath = TemporaryFile.tmpDirectory + "/" + path + "/"
            val filePath = folderPath + name
            val guardFilePath = folderPath + ".guard" + guard

            val folder = new File(folderPath)
            val file = new File(filePath)
            val guardFile = new File(guardFilePath)

            val temporaryExists: Boolean =
                folder.exists() && folder.isDirectory &&
                    file.exists() && !file.isDirectory &&
                    guardFile.exists() && !guardFile.isDirectory

            if (temporaryExists) {
                val fileHash = FileUtils.fileContentHash("MD5", filePath)
                val guardHash = Source.fromFile(guardFile).getLines().toList.head
                val hashValid: Boolean = guardHash.contains(fileHash) && guardHash.contentEquals(hash)

                hashValid
            } else {
                false
            }
        } else {
            false
        }
    }

    def getFile: Option[File] = {
        if (validate()) {
            val folderPath = TemporaryFile.tmpDirectory + "/" + path + "/"
            val filePath = folderPath + name
            Some(new File(filePath))
        } else {
            None
        }
    }

    def clear(): Unit = {
        val folderPath = TemporaryFile.tmpDirectory + "/" + path + "/"
        val filePath = folderPath + name
        val guardFilePath = folderPath + ".guard" + guard

        val folder = new File(folderPath)
        val file = new File(filePath)
        val guardFile = new File(guardFilePath)

        guardFile.delete()
        file.delete()
        folder.delete()
    }

}

object TemporaryFile {
    implicit val temporaryFileWrites: OWrites[TemporaryFile] = Json.writes[TemporaryFile]

    // TODO Configuration file
    private val tmpDirectory: String = "/tmp"

    // TODO Create scheduler to delete temporary files in case of nobody needs it
    def create(name: String, content: String): TemporaryFile = {
        val dateFormat: SimpleDateFormat = new SimpleDateFormat("HH:mm-dd-MM-yyyy")
        val currentData: String = dateFormat.format(new Date())

        val path = CommonUtils.randomAlphaString(30)
        val outputFolderPath = TemporaryFile.tmpDirectory + "/" + path + "/"
        FileUtils.createDirectory(outputFolderPath)

        val fileName = currentData + "-" + name
        val fileAbsolutePath = outputFolderPath + fileName

        val printWriter = new PrintWriter(new File(fileAbsolutePath))
        printWriter.write(content)
        printWriter.close()

        val hash = FileUtils.fileContentHash("MD5", fileAbsolutePath) + currentData
        val guard = CommonUtils.randomAlphaNumericString(50)

        val guardWriter = new PrintWriter(new File(outputFolderPath + ".guard" + guard))
        guardWriter.write(hash)
        guardWriter.close()

        TemporaryFile(fileName, path, guard, hash)
    }
}

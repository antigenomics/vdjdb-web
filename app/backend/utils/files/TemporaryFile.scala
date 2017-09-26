package backend.utils.files

import java.io.{File, PrintWriter}
import java.text.SimpleDateFormat
import java.util.Date

import backend.utils.CommonUtils

import scala.io.Source

case class TemporaryFile(private val filePath: String, private val guardPath: String, private val folderPath: String) {

    def isLocked: Boolean = {
        val lockFile = new File(folderPath + ".lock")
        lockFile.exists()
    }

    def getFile: Option[File] = {
        val file = new File(filePath)
        if (file.exists() && file.isFile) {
            Some(file)
        } else {
            None
        }
    }

    def delete(): Unit = {
        val folder = new File(folderPath)
        val file = new File(filePath)
        val guardFile = new File(guardPath)
        val lockFile = new File(folderPath + ".lock")

        if (guardFile.exists()) {
            guardFile.delete()
        }
        if (file.exists()) {
            file.delete()
        }
        if (lockFile.exists()) {
            lockFile.delete()
        }
        if (folder.exists()) {
            folder.delete()
        }
    }

}

object TemporaryFile {
    private val tmpDirectory: String = "/tmp/vdjdb"

    def create(name: String, content: String): TemporaryFileLink = {
        val dateFormat: SimpleDateFormat = new SimpleDateFormat("HH:mm-dd-MM-yyyy")
        val currentData: String = dateFormat.format(new Date())

        val unique = CommonUtils.randomAlphaString(30)
        val outputFolderPath = TemporaryFile.tmpDirectory + "/" + unique + "/"
        FileUtils.createDirectory(outputFolderPath)

        val fileName = currentData + "-" + name
        val fileAbsolutePath = outputFolderPath + fileName

        val printWriter = new PrintWriter(new File(fileAbsolutePath))
        printWriter.write(content)
        printWriter.close()

        val hash = FileUtils.fileContentHash("MD5", fileAbsolutePath) + currentData
        val guard = CommonUtils.randomAlphaNumericString(50)

        val guardWriter = new PrintWriter(new File(outputFolderPath + ".guard" + guard))
        guardWriter.println(fileName)
        guardWriter.println(hash)
        guardWriter.close()

        TemporaryFileLink(unique, guard, hash)
    }

    def find(link: TemporaryFileLink, lock: Boolean = true): Option[TemporaryFile] = {
        val unique = link.unique
        val guard = link.guard
        val hash = link.hash

        val invalidLink = unique.contains("..") || guard.contains("..")

        if (!invalidLink) {
            val folderPath = TemporaryFile.tmpDirectory + "/" + unique + "/"
            val guardPath = folderPath + ".guard" + guard

            val folder = new File(folderPath)
            val guardFile = new File(guardPath)

            val temporaryExists: Boolean =
                folder.exists() && folder.isDirectory &&
                    guardFile.exists() && !guardFile.isDirectory

            if (temporaryExists) {
                if (lock) {
                    val lockPath = folderPath + ".lock"
                    val lockFile = new File(lockPath)
                    lockFile.createNewFile()
                }

                val guard = Source.fromFile(guardFile).getLines().toList
                val guardFileName = guard.head
                val guardHash = guard(1)

                val filePath = folderPath + guardFileName
                val fileHash = FileUtils.fileContentHash("MD5", filePath)
                val hashValid: Boolean = guardHash.contains(fileHash) && guardHash.contentEquals(hash)

                if (hashValid) {
                    Some(TemporaryFile(filePath, guardPath, folderPath))
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        }
    }
}

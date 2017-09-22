package backend.utils

import java.io.File
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.nio.file.{Files, Paths}
import java.security.MessageDigest

object FileUtils {

    def getDirectoryFiles(directory: String): List[File] = {
        val file = new File(directory)
        if (file.exists && file.isDirectory) {
            file.listFiles.filter(_.isFile).toList
        } else {
            List[File]()
        }
    }

    def copyFile(source: String, dest: String): Unit = {
        Files.copy(Paths.get(source), Paths.get(dest), REPLACE_EXISTING)
    }

    def createDirectory(directory: String): Unit = {
        val file = new File(directory)
        if (!file.exists) {
            file.mkdirs()
        }
    }

    // t is the type of checksum, i.e. MD5, or SHA-512 or whatever
    // path is the path to the file you want to get the hash of
    def fileContentHash(t: String, path: String): String = {
        val arr = Files readAllBytes (Paths get path)
        val checksum = MessageDigest.getInstance(t) digest arr
        checksum.map("%02X" format _).mkString
    }

}

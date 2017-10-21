/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.utils.files

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

    // t is the type of checksum, i.e. MD5, or SHA-512 or whatever
    // path is the path to the file you want to get the hash of
    def fileContentHash(t: String, path: String): String = {
        val arr = Files readAllBytes (Paths get path)
        val checksum = MessageDigest.getInstance(t) digest arr
        checksum.map("%02X" format _).mkString
    }

}

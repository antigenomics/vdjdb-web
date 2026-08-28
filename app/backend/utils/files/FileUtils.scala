/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.utils.files

import java.io.{EOFException, File, FileInputStream, FileOutputStream, InputStream, OutputStream}
import java.nio.file.{Files, Paths}
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.security.MessageDigest
import java.util.zip._

import play.api.libs.Files.TemporaryFile

/** Raised when an upload expands past the configured ceiling — i.e. a decompression bomb. */
class DecompressionLimitException(message: String) extends RuntimeException(message)

/** Bounds on how far an uploaded archive may expand.
  *
  * Neither the multipart cap nor the per-account quota can catch a bomb: both measure *compressed*
  * bytes, and a bomb is tiny compressed by construction. Real repertoire data expands ~5x (measured
  * on the shipped demo samples), so a ratio limit in the hundreds is generous for honest input while
  * still rejecting the 1000x+ pathological cases.
  */
case class DecompressionLimits(maxBytes: Long, maxRatio: Long)

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

  /** Depth-first tree delete. `File.delete()` only removes an *empty* directory, so deleting a user
    * folder that still holds per-sample subdirectories is a silent no-op — which is one of the ways
    * orphaned upload directories accumulate on disk. */
  def deleteRecursively(file: File): Unit = {
    if (file.isDirectory) {
      Option(file.listFiles()).foreach(_.foreach(deleteRecursively))
    }
    val _ = file.delete()
  }

  // t is the type of checksum, i.e. MD5, or SHA-512 or whatever
  // path is the path to the file you want to get the hash of
  def fileContentHash(t: String, path: String): String = {
    val arr = Files readAllBytes (Paths get path)
    val checksum = MessageDigest.getInstance(t) digest arr
    checksum.map("%02X" format _).mkString
  }

  def isGZipped(file: File): Boolean = {
    try {
      val gzip = new GZIPInputStream(new FileInputStream(file))
      gzip.close()
      true
    } catch {
      case _: ZipException => false
      // An empty file cannot yield the two magic bytes, so the header read hits EOF rather than
      // failing the magic-number check. Only ZipException was caught, so it escaped as an
      // EOFException from whatever asked -- which meant SampleConverter.convert never reached its
      // own "The file appears to be empty", and reported a stack-trace class name instead.
      case _: EOFException => false
    }
  }

  /** Copy `in` to `out`, aborting as soon as the *decompressed* stream exceeds `limits`.
    *
    * The check has to happen while streaming: by the time a bomb has been fully expanded to a temp
    * file the damage (disk, and later heap when the sample is parsed) is already done. Returns the
    * number of bytes written.
    */
  private def copyBounded(in: InputStream, out: OutputStream, compressedSize: Long, limits: DecompressionLimits): Long = {
    val buffer   = new Array[Byte](8192)
    var total    = 0L
    var len      = in.read(buffer)
    while (len > 0) {
      total += len
      if (total > limits.maxBytes) {
        throw new DecompressionLimitException(
          s"Uncompressed file exceeds the ${limits.maxBytes / (1024 * 1024)} MB limit")
      }
      if (compressedSize > 0 && total / compressedSize > limits.maxRatio) {
        throw new DecompressionLimitException(
          s"File expands more than ${limits.maxRatio}x when decompressed, which looks like a decompression bomb")
      }
      out.write(buffer, 0, len)
      len = in.read(buffer)
    }
    total
  }

  /** An already-gzipped upload is stored as-is, so it never passes through `copyBounded` on the way
    * in — decompress it once into a sink to prove it stays inside the limits before we accept it.
    * Bounded by `limits`, so this cannot itself be turned into the attack. */
  def validateGzipWithinLimits(file: File, limits: DecompressionLimits): Long = {
    // Discarding sink. The bulk overload matters: the default OutputStream implementation would fan
    // out to one virtual call per byte.
    val sink = new OutputStream {
      override def write(b: Int): Unit                                = ()
      override def write(b: Array[Byte], off: Int, len: Int): Unit    = ()
    }
    val in = new GZIPInputStream(new FileInputStream(file))
    try copyBounded(in, sink, file.length(), limits) finally in.close()
  }

  def convertToGzip(file: play.api.libs.Files.TemporaryFile, limits: DecompressionLimits): TemporaryFile = {
    if (isGZipped(file.getAbsoluteFile)) {
      val _ = validateGzipWithinLimits(file.getAbsoluteFile, limits)
      file
    } else {
      // ponytail: zip is not a supported upload format - plain text and gzip only. A .zip arriving
      // anyway is gzipped verbatim and then fails header detection with a "missing required columns"
      // error, which is the right outcome for an unsupported format.
      val gzipped = convertPlainToGzip(file, limits)
      file.delete()
      gzipped
    }
  }

  def convertPlainToGzip(file: play.api.libs.Files.TemporaryFile, limits: DecompressionLimits): TemporaryFile = {
    val fileInputStream = new FileInputStream(file.getAbsoluteFile)
    val creator = play.api.libs.Files.SingletonTemporaryFileCreator
    // GZIP output stream
    val outputFile = creator.create(file.getAbsoluteFile.getName, ".gz")
    val gzip = new GZIPOutputStream(new FileOutputStream(outputFile.getAbsoluteFile))

    // Plain input is already bounded by the multipart cap, but keep the same ceiling so the limit is
    // enforced in exactly one place regardless of how the file arrived.
    try {
      val _ = copyBounded(fileInputStream, gzip, 0L, limits)
    } catch {
      case e: DecompressionLimitException =>
        gzip.close(); fileInputStream.close(); outputFile.delete()
        throw e
    }
    gzip.close()

    fileInputStream.close()
    outputFile
  }

}

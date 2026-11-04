package backend.utils

import java.io.{File, FileInputStream, InputStream}
import java.nio.charset.StandardCharsets
import java.util.zip.GZIPInputStream
import scala.io.Source

/** Legacy releases use plain member names; local builds may compress large tables. */
object TableFiles {
  def resolve(file: File): File = {
    val gzip = new File(file.getPath + ".gz")
    if (!file.isFile && gzip.isFile) gzip else file
  }

  def open(file: File): InputStream = {
    val resolved = resolve(file)
    val stream = new FileInputStream(resolved)
    if (resolved.getName.endsWith(".gz")) {
      try new GZIPInputStream(stream)
      catch { case error: Exception => stream.close(); throw error }
    } else stream
  }

  def source(file: File): Source = Source.fromInputStream(open(file), StandardCharsets.UTF_8.name())
}

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

package backend.server.database

import java.io.File
import java.nio.charset.StandardCharsets
import java.util.Base64

import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory

import scala.util.control.NonFatal
import scala.util.matching.Regex

/** One image lifted out of the summary document. */
final case class SummaryImage(bytes: Array[Byte], contentType: String)

/** The summary document with its images served separately rather than inlined.
  *
  * @param html    the rewritten document, UTF-8, with every `data:` URI replaced by a URL
  * @param etag    derived from the source file, so it changes exactly when the database is rebuilt
  * @param images  in the order they appeared; the URL carries the index
  */
final case class DatabaseSummary(html: Array[Byte], etag: String, images: IndexedSeq[SummaryImage])

/** Splits the Overview document's inlined images out into separately addressable resources.
  *
  * The document as generated is 5.68 MB, and 98% of that is eight base64 `data:` URIs holding PNGs.
  * That is close to the worst possible shape for something served over HTTP:
  *
  *   - base64 costs a third again on top of the bytes it encodes, so ~1.4 MB is pure encoding overhead
  *   - the PNGs are already compressed, so gzip recovers almost none of it - the whole document
  *     compresses by 26%, which is why it still crosses the wire at 4.19 MB
  *   - it is one indivisible response, so nothing renders until the last byte of the last image lands,
  *     and a single conditional request either revalidates all of it or none of it
  *
  * Split, the document is ~100 KB and gzips like the HTML it is, the images fetch in parallel, and each
  * one is cacheable on its own. The work happens once, lazily, on the first request that needs it -
  * not at boot, where it would delay startup for a page most visitors never open.
  */
@Singleton
class DatabaseSummaryProvider @Inject()(database: Database) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  /** Deliberately narrow: base64 alphabet only, no whitespace. The generator emits these as single
    * unbroken attribute values, and matching greedily across newlines risks swallowing markup. */
  private final val DataUri: Regex = """data:image/([A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)""".r

  private lazy val summary: Option[DatabaseSummary] = database.getSummaryFile.flatMap(build)

  def get: Option[DatabaseSummary] = summary

  def image(index: Int): Option[SummaryImage] =
    summary.flatMap(s => if (index >= 0 && index < s.images.length) Some(s.images(index)) else None)

  private def build(file: File): Option[DatabaseSummary] = {
    try {
      val source = scala.io.Source.fromFile(file, "UTF-8")
      val text = try source.mkString finally source.close()

      val images = IndexedSeq.newBuilder[SummaryImage]
      var index = 0
      // `replaceAllIn` with a replacer runs once per match in document order, which is what makes the
      // index it hands out line up with the position in `images`.
      val rewritten = DataUri.replaceAllIn(text, m => {
        val decoded = Base64.getMimeDecoder.decode(m.group(2))
        images += SummaryImage(decoded, s"image/${m.group(1)}")
        val url = s"/api/database/summary/image/$index"
        index += 1
        Regex.quoteReplacement(url)
      })

      val built = images.result()
      val etag = "\"" + java.lang.Long.toHexString(file.lastModified()) + "-" +
        java.lang.Long.toHexString(file.length()) + "\""

      logger.info(s"Database summary: ${built.length} image(s) split out, " +
        s"document ${file.length()} -> ${rewritten.length} bytes")

      Some(DatabaseSummary(rewritten.getBytes(StandardCharsets.UTF_8), etag, built))
    } catch {
      // A malformed document must not take the endpoint down with it - the caller falls back to
      // reporting the summary as unavailable, which is the same thing it does when the file is absent.
      case NonFatal(ex) =>
        logger.warn(s"Cannot split the database summary at '${file.getPath}'", ex)
        None
    }
  }
}

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

import java.io.{BufferedInputStream, ByteArrayOutputStream, File, FileInputStream, InputStream}
import java.nio.file.{Files, Paths}

import backend.server.database.api.suggestions.{DatabaseColumnSuggestion, DatabaseColumnSuggestionsResponse}
import com.antigenomics.vdjdb.web.EpitopeSuggestionGenerator
import com.antigenomics.vdjdb.{Util, VdjdbInstance}
import com.typesafe.scalalogging.Logger
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration

import scala.annotation.tailrec
import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

@Singleton
case class Database @Inject()(configuration: Configuration) {
  private final val instance: VdjdbInstance = Database.createInstanceFromConfiguration(configuration)
  private final val metadata: DatabaseMetadata = DatabaseMetadata.createFromInstance(instance)
  private final val databaseLocation: String = Database.getDatabaseLocation(configuration)
  private final val suggestions = mutable.HashMap[String, DatabaseColumnSuggestionsResponse]()

  // Eagerly warm up suggestions cache at startup to avoid blocking first user request
  Future {
    getSuggestions("antigen.epitope")
  }

  def getMetadata: DatabaseMetadata = metadata

  def getInstance: VdjdbInstance = instance

  def getLocation: String = databaseLocation

  def getSummaryFile: Option[File] = {
    val summaryFile = new File(getLocation + "/" + "vdjdb_summary_embed.html")
    if (summaryFile.exists()) {
      Some(summaryFile)
    } else {
      None
    }
  }

  def getMotifFile: Option[File] = {
    val motifsFile = new File(getLocation + "/" + "motif_pwms.txt")
    if (motifsFile.exists()) {
      Some(motifsFile)
    } else {
      None
    }
  }

  def getClusterMembersFile: Option[File] = {
    val clusterMembersFile = new File(getLocation + "/" + "cluster_members.txt")
    if (clusterMembersFile.exists()) {
      Some(clusterMembersFile)
    } else {
      None
    }
  }

  def getMotifFileTCREMP: Option[File] = {
    val f = new File(getLocation + "/" + "motif_pwms_tcremp.txt")
    if (f.exists()) Some(f) else None
  }

  def getClusterMembersFileTCREMP: Option[File] = {
    val f = new File(getLocation + "/" + "cluster_members_tcremp.txt")
    if (f.exists()) Some(f) else None
  }

  def getSuggestionsAvailableColumns: Seq[String] = Seq("antigen.epitope")

  def getSuggestions(column: String): Option[DatabaseColumnSuggestionsResponse] = {
    if (suggestions.contains(column)) {
      Some(suggestions(column))
    } else {
      column match {
        case "antigen.epitope" =>
          suggestions.update(column, DatabaseColumnSuggestionsResponse(EpitopeSuggestionGenerator.generateSuggestions(instance)
            .asScala.mapValues(_.asScala.map(DatabaseColumnSuggestion.createFromEpitopeSuggestion).toList).toMap))
          getSuggestions(column)
        case _ => None
      }
    }
  }
}

object Database {

  // Rows of vdjdb.txt that carry fewer tab separated columns than the header have to be padded before
  // VdjdbInstance parses them. The padding is applied as a streaming wrapper rather than by reading the
  // file into a String and splitting it: the file is hundreds of megabytes, and the chain this replaces
  // (read, split, map, join, getBytes) held four full copies of it on the heap at once, at boot, on top
  // of the database instance being built from it. Only one line is live here at a time.
  //
  // The work is done on raw bytes. UTF-8 never encodes '\n' or '\t' as part of a multi byte sequence, so
  // counting and inserting them byte wise gives exactly the same result as doing it on decoded text,
  // and every other byte is passed through untouched instead of being decoded and re-encoded.
  private class SanitizedDataStream(source: InputStream) extends InputStream {
    private final val TAB: Int = '\t'.toInt
    private final val NEW_LINE: Int = '\n'.toInt

    private final val in = new BufferedInputStream(source)

    // Taken from the first line and never updated: it is the column count every later line is padded up
    // to. The header itself needs no padding, since it is what defines the count.
    private var headerColumns: Int = -1
    // Empty lines are held back until a non-empty line follows, because splitting the file on "\n" used
    // to drop the empty lines at the end of it, and we have to keep dropping them.
    private var heldEmptyLines: Int = 0
    private var anythingEmitted: Boolean = false
    private var exhausted: Boolean = false

    private var chunk: Array[Byte] = Array.emptyByteArray
    private var chunkPosition: Int = 0

    override def read(): Int = {
      if (!ensureChunk()) {
        -1
      } else {
        val value = chunk(chunkPosition).toInt & 0xFF
        chunkPosition += 1
        value
      }
    }

    override def read(buffer: Array[Byte], offset: Int, length: Int): Int = {
      if (length == 0) {
        0
      } else if (!ensureChunk()) {
        -1
      } else {
        val count = Math.min(length, chunk.length - chunkPosition)
        System.arraycopy(chunk, chunkPosition, buffer, offset, count)
        chunkPosition += count
        count
      }
    }

    override def close(): Unit = {
      exhausted = true
      in.close()
    }

    // A chunk is one sanitized line together with the separator and the held empty lines in front of it,
    // so it is never empty and read() can always hand out at least one byte once this returns true.
    private def ensureChunk(): Boolean = {
      if (chunkPosition < chunk.length) {
        true
      } else if (exhausted) {
        false
      } else {
        val line = nextNonEmptyLine()
        if (line == null) {
          // Closed here rather than left to the caller, because VdjdbInstance never closes the streams
          // it is constructed from.
          close()
          false
        } else {
          chunk = buildChunk(line)
          chunkPosition = 0
          true
        }
      }
    }

    @tailrec
    private def nextNonEmptyLine(): Array[Byte] = {
      val line = readLine()
      if (line == null) {
        null
      } else {
        if (headerColumns < 0) {
          headerColumns = countColumns(line)
        }
        if (line.length == 0) {
          heldEmptyLines += 1
          nextNonEmptyLine()
        } else {
          line
        }
      }
    }

    // Returns the bytes up to the next '\n', or null once the source has nothing left. Only '\n' ends a
    // line: a lone '\r' stays part of it, exactly as it did when the file was split on "\n".
    private def readLine(): Array[Byte] = {
      var value = in.read()
      if (value == -1) {
        null
      } else {
        val line = new ByteArrayOutputStream()
        while (value != -1 && value != NEW_LINE) {
          line.write(value)
          value = in.read()
        }
        line.toByteArray
      }
    }

    private def countColumns(line: Array[Byte]): Int = {
      var columns = 1
      var i = 0
      while (i < line.length) {
        if (line(i).toInt == TAB) {
          columns += 1
        }
        i += 1
      }
      columns
    }

    private def buildChunk(line: Array[Byte]): Array[Byte] = {
      val bytes = new ByteArrayOutputStream()
      var held = heldEmptyLines
      while (held > 0) {
        writeLine(bytes, Array.emptyByteArray)
        held -= 1
      }
      heldEmptyLines = 0
      writeLine(bytes, line)
      bytes.toByteArray
    }

    // Padding an empty line is a no-op whenever the header itself was empty, so the header never gets
    // padded even when it is the one line being held back, and no special case for it is needed.
    private def writeLine(bytes: ByteArrayOutputStream, line: Array[Byte]): Unit = {
      if (anythingEmitted) {
        bytes.write(NEW_LINE)
      }
      bytes.write(line)
      var padding = headerColumns - countColumns(line)
      while (padding > 0) {
        bytes.write(TAB)
        padding -= 1
      }
      anythingEmitted = true
    }
  }

  // Wrapped in a BufferedInputStream so the result is a drop-in for the ByteArrayInputStream this used
  // to return. That one reported markSupported() == true and a real available(); SanitizedDataStream
  // overrides neither, so on its own it would answer false and 0. Nothing in this repo probes for
  // either, but VdjdbInstance is a third-party jar we do not build, and a boot-time break that only
  // reproduces against the real vdjdb.txt is not worth leaving to chance for one wrapper. The buffer
  // also amortises the per-line read() calls the sanitizer makes.
  private def sanitizeDataStream(stream: InputStream): InputStream =
    new BufferedInputStream(new SanitizedDataStream(stream))

  /** The same padding pass, reachable from the offline prior generator.
    *
    * That tool builds a `VdjdbInstance` from the database files directly rather than through Guice, and
    * it has to build the one production parses: the raw table has short lines that only become valid
    * rows once padded to the header's column count. A generator that skipped this would tabulate a
    * different database from the one it is used to score. */
  private[backend] def sanitized(stream: InputStream): InputStream = sanitizeDataStream(stream)

  private def createInstanceFromConfiguration(configuration: Configuration): VdjdbInstance = {
    val databaseConfiguration = configuration.get[DatabaseConfiguration]("application.database")
    if (databaseConfiguration.useLocal) {
      val metaFilePath = databaseConfiguration.path + "vdjdb.meta.txt"
      val dataFilePath = databaseConfiguration.path + "vdjdb.txt"

      if (Files.exists(Paths.get(metaFilePath)) && Files.exists(Paths.get(dataFilePath))) {
        new VdjdbInstance(new FileInputStream(metaFilePath), sanitizeDataStream(new FileInputStream(dataFilePath)))
      } else {
        val logger = Logger(LoggerFactory.getLogger(this.getClass))
        logger.warn("Local database is missing in '" + databaseConfiguration.path + "'")
        logger.warn("Trying to download database")
        new VdjdbInstance()
      }
    } else {
      new VdjdbInstance()
    }
  }

  private def getDatabaseLocation(configuration: Configuration): String = {
    val databaseConfiguration = configuration.get[DatabaseConfiguration]("application.database")
    if (databaseConfiguration.useLocal) {
      val metaFilePath = databaseConfiguration.path + "vdjdb.meta.txt"
      val dataFilePath = databaseConfiguration.path + "vdjdb.txt"

      if (Files.exists(Paths.get(metaFilePath)) && Files.exists(Paths.get(dataFilePath))) {
        databaseConfiguration.path
      } else {
        Util.getHOME_DIR
      }
    } else {
      Util.getHOME_DIR
    }
  }

}
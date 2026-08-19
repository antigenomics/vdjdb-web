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

package backend.server.structures

import backend.server.structures.api._

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}
import java.util.Locale


import scala.collection.mutable
import scala.io.Source
import scala.util.Try

/** Reads `structures_metadata.tsv` — the per-model confidence numbers written by
  * `tools/build_structures_metadata.py`.
  *
  * Nothing here is computed; every field is read. Columns are looked up by header name, so their
  * order in the file is irrelevant, and each numeric cell is parsed independently — one malformed
  * value costs that field, not the row and not the load.
  */
object StructureMetricsIndex {

  final val FileName = "structures_metadata.tsv"

  /** Keyed by lower-cased hash, matching the generator. Absent or empty file yields an empty map:
    * a deployment without the companion file shows structures with no metrics rather than failing. */
  def load(databaseLocation: Path): Map[String, StructureModelMetrics] = {
    val path = databaseLocation.resolve(FileName)
    if (!Files.isRegularFile(path)) Map.empty else parse(path)
  }

  private def parse(path: Path): Map[String, StructureModelMetrics] = {
    val source = Source.fromFile(path.toFile, StandardCharsets.UTF_8.name())
    try {
      val lines = source.getLines()
      if (!lines.hasNext) {
        Map.empty
      } else {
        val columns = lines.next().split("\t", -1).map(_.trim).zipWithIndex.toMap
        val metrics = mutable.LinkedHashMap.empty[String, StructureModelMetrics]

        lines.foreach { line =>
          val cells = line.split("\t", -1)

          def cell(name: String): Option[String] =
            columns.get(name)
              .filter(_ < cells.length)
              .map(index => cells(index).trim)
              .filter(_.nonEmpty)

          // First occurrence wins, same rule the generator dedupes by.
          cell("hash").map(_.toLowerCase(Locale.ROOT)).filterNot(metrics.contains).foreach { hash =>
            metrics.update(hash, StructureModelMetrics(
              // A Boolean: a blank is not native. Contrast bindingModeOutlier below.
              isNative = cell("is_native").exists(_.equalsIgnoreCase("true")),
              numContacts = cell("num_contacts").flatMap(value => Try(value.toInt).toOption),
              iptm = cell("iptm").flatMap(value => Try(value.toDouble).toOption),
              confidence = cell("confidence").flatMap(value => Try(value.toDouble).toOption),
              // Percentiles rank the modelled subset only, so a native row legitimately has none.
              iptmPct = cell("iptm_pct").flatMap(value => Try(value.toInt).toOption),
              confidencePct = cell("confidence_pct").flatMap(value => Try(value.toInt).toOption),
              // An Option: "not an outlier" and "never assessed" are different answers.
              bindingModeOutlier = cell("binding_mode_outlier").map(_.equalsIgnoreCase("true"))))
          }
        }

        metrics.toMap
      }
    } finally {
      source.close()
    }
  }
}

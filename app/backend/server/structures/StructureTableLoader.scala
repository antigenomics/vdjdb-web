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

import java.nio.charset.StandardCharsets

import tech.tablesaw.api.{ColumnType, StringColumn, Table}
import tech.tablesaw.io.csv.CsvReadOptions

import scala.io.Source

/** Reads `vdjdb.txt` into the table the structure browser works from.
  *
  * Only the columns the browser actually reads are loaded — the rest are skipped at parse time
  * rather than loaded and ignored, which matters at ~228k rows. Everything is read as text: the
  * browser groups and matches on these values, it never does arithmetic with them.
  */
object StructureTableLoader {

  /** Skipped at parse time. Everything else in the header is loaded as a string, including columns
    * added after this list was written — which is why this is a skip-set and not an allow-list. */
  final val SkippedColumns: Set[String] = Set(
    "complex.id",
    "reference.id",
    "method",
    "vdjdb.score",
    "web.method",
    "web.method.seq",
    "web.cdr3fix.nc",
    "web.cdr3fix.unmp")

  /** Column synthesized here, not present in the file: the MHC chain pair, used as a level of the
    * metadata tree. */
  final val MhcPairColumn = "mhc.pair"

  def load(path: String): Table = {
    val table = read(path)
    trimAlleleSuffix(table, "mhc.a")
    trimAlleleSuffix(table, "mhc.b")
    table.addColumns(mhcPairColumn(table))
    table
  }

  private def read(path: String): Table = {
    val options = CsvReadOptions.builder(path).separator('\t').header(true).sample(false)

    // Types are assigned by header name. A file whose first line is missing or blank has nothing to
    // assign them from, so Tablesaw is left to infer - it has no rows to get wrong.
    val header = readHeader(path)
    val configured =
      if (header.isEmpty) options
      else options.columnTypes(header.map(name => if (SkippedColumns.contains(name)) ColumnType.SKIP else ColumnType.STRING))

    Table.read().csv(configured.build())
  }

  private def readHeader(path: String): Array[String] = {
    val source = Source.fromFile(path, StandardCharsets.UTF_8.name())
    try {
      source.getLines()
        .find(line => line != null && line.trim.nonEmpty)
        .map(_.split("\t", -1))
        .getOrElse(Array.empty[String])
    } finally {
      source.close()
    }
  }

  /** `HLA-A*02:01` becomes `HLA-A*02`. The tree groups by chain pair, and allele-level resolution
    * would split one group into dozens of near-duplicates. */
  private def trimAlleleSuffix(table: Table, column: String): Unit =
    if (table.columnNames().contains(column)) {
      table.replaceColumn(column, table.stringColumn(column).replaceAll(":.+", "").setName(column))
    }

  /** `<mhc.a>/<mhc.b>`, or empty when either half is missing — a pair naming only one chain would
    * group structures that do not belong together. */
  private def mhcPairColumn(table: Table): StringColumn = {
    val pairs = new java.util.ArrayList[String](table.rowCount())

    if (table.columnNames().contains("mhc.a") && table.columnNames().contains("mhc.b")) {
      val alpha = table.stringColumn("mhc.a")
      val beta = table.stringColumn("mhc.b")

      (0 until table.rowCount()).foreach { row =>
        val a = Option(alpha.get(row)).map(_.trim).getOrElse("")
        val b = Option(beta.get(row)).map(_.trim).getOrElse("")
        pairs.add(if (a.nonEmpty && b.nonEmpty) s"$a/$b" else "")
      }
    } else {
      (0 until table.rowCount()).foreach(_ => pairs.add(""))
    }

    StringColumn.create(MhcPairColumn, pairs)
  }
}

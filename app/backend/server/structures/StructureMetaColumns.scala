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

import play.api.libs.json.{JsLookupResult, JsValue, Json}
import tech.tablesaw.api.{StringColumn, Table}

import scala.util.Try

/** Columns the structure browser needs that `vdjdb.txt` does not carry directly.
  *
  * Both are derived per row from the free-text `meta` cell, which holds a JSON object whose shape
  * has drifted over the years — hence the list of candidate keys rather than one.
  */
object StructureMetaColumns {

  /** Tried in order. The same value has been written under all of these at one time or another, and
    * old rows were never rewritten. */
  final val StructureIdKeys: Seq[String] = Seq(
    "structure.id",
    "structureId",
    "structure",
    "structure_id",
    "structureHash",
    "structure.hash",
    "TCR_hash")

  final val CellSubsetKeys: Seq[String] = Seq("cell.subset", "cellSubset", "cell_subset")

  /** `structure.id` per row: the hash column if the row has one, else whatever the meta JSON offers.
    *
    * The hash column wins because it is the value the structure files are actually named after; meta
    * is the fallback for rows that predate it.
    */
  def structureIdColumn(table: Table): StringColumn =
    build(table, "structure.id") { (meta, hash) =>
      hash.flatMap(StructureIdentifiers.sanitize)
        .orElse(valueFromMeta(meta, StructureIdKeys))
        .getOrElse("")
    }

  /** Any other column lifted straight out of the meta JSON. */
  def derivedColumn(table: Table, name: String, keys: Seq[String]): StringColumn =
    build(table, name) { (meta, _) => valueFromMeta(meta, keys).getOrElse("") }

  /** First key that yields a non-empty string.
    *
    * A dotted key is tried flat first — `meta` really does contain a literal `"structure.id"`
    * field — and only then as a path into nested objects.
    *
    * Unparseable JSON yields nothing rather than throwing. It used to throw, from inside a `val`
    * initializer, so a single malformed cell arriving in a database refresh would have taken the
    * application down at startup rather than costing that one row its structure id.
    */
  def valueFromMeta(meta: String, keys: Seq[String]): Option[String] =
    Option(meta).filter(_.nonEmpty)
      .flatMap(text => Try(Json.parse(text)).toOption)
      .flatMap(json => keys.view.flatMap(key => lookup(json, key)).map(_.trim).find(_.nonEmpty))

  private def lookup(json: JsValue, key: String): Option[String] =
    (json \ key).asOpt[String].orElse {
      key.split("\\.").toList match {
        case head :: tail if tail.nonEmpty =>
          tail.foldLeft(json \ head: JsLookupResult)((result, part) => result \ part).toOption.flatMap(_.asOpt[String])
        case _ => None
      }
    }

  private def build(table: Table, name: String)(cell: (String, Option[String]) => String): StringColumn = {
    val meta = metaColumn(table)
    val hash = hashColumn(table)
    val values = new java.util.ArrayList[String](table.rowCount())

    (0 until table.rowCount()).foreach { row =>
      values.add(cell(Try(meta.get(row)).getOrElse(""), hash.flatMap(column => Option(column.get(row)))))
    }

    StringColumn.create(name, values)
  }

  private def metaColumn(table: Table): StringColumn =
    if (table.columnNames().contains("meta")) table.stringColumn("meta") else StringColumn.create("meta")

  /** `contacts` is the old name for the same value; some deployments still ship it. */
  private def hashColumn(table: Table): Option[StringColumn] =
    Seq("TCR_hash", "contacts").find(table.columnNames().contains).map(table.stringColumn)
}

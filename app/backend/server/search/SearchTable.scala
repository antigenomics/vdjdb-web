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

package backend.server.search

import backend.server.ResultsTable
import backend.server.database.Database
import backend.server.database.filters.DatabaseFilters

import scala.collection.JavaConverters._
import scala.math.Ordering.String

class SearchTable extends ResultsTable[SearchTableRow] {

  def sort(columnIndex: Int, sortType: String): Unit = {
    if ((sortType == "desc" || sortType == "asc") && (columnIndex >= 0)) {
      rows = rows.sortWith((e1, e2) => {
        val v1 = e1.entries(columnIndex)
        val v2 = e2.entries(columnIndex)
        sortType match {
          case "desc" => String.gt(v1, v2)
          case "asc"  => String.lt(v1, v2)
        }
      })
    }
  }

  def update(filters: DatabaseFilters, database: Database): SearchTable = {
    val results = database.getInstance.getDbInstance.search(filters.text, filters.sequence)
    this.rows = results.asScala.map(r => SearchTableRow.createFromRow(r.getRow))
    filters.options.foreach {
      case ("append-paired", enabled) =>
        if (enabled) {
          this.rows = this.rows ++ SearchTable.getPairedRows(this.rows, database)
        }
      case _ =>
    }
    this.currentPage = 0
    this
  }
}

object SearchTable {

  def getPairedRows(rows: Seq[SearchTableRow], database: Database): Seq[SearchTableRow] = {
    // Search for the rows which potentially has a paired one
    val rowsWithPairedExist = rows.filter(r => !(r.metadata.pairedID == "0"))

    val complexIdIndex     = database.getInstance.getDbInstance.getColumnIndex("complex.id")
    val geneIdIndex        = database.getInstance.getDbInstance.getColumnIndex("gene")
    val visibleGeneIdIndex = database.getMetadata.getColumnIndex("gene")

    // Filter out paired id's which is already both in a list
    val complexIDsWithoutPairedInList = rowsWithPairedExist
      .groupBy(r => r.metadata.pairedID)
      .mapValues(r => (r, r.size))
      .filter(r => r._2._2 == 1)
      .map(r => (r._1, r._2._1.head.entries(visibleGeneIdIndex).toString))

    val pairedTable = database.getInstance.getDbInstance.getRows.asScala
      .filter(
        p =>
          p.getAt(complexIdIndex).getValue match {
            case "0" => false
            case complexId =>
              complexIDsWithoutPairedInList.get(complexId) match {
                case Some("TRA") => p.getAt(geneIdIndex).getValue == "TRB"
                case Some("TRB") => p.getAt(geneIdIndex).getValue == "TRA"
                case _           => false
              }
          }
      )

    pairedTable.map(SearchTableRow.createFromRow)
  }
}

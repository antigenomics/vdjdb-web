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
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}

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
          case "asc" => String.lt(v1, v2)
        }
      })
    }
  }

  def update(filters: DatabaseFilters, database: Database): SearchTable = {
    val results = database.getInstance.getDbInstance.search(filters.text, filters.sequence)
    this.rows = results.asScala.map(r => SearchTableRow.createFromRow(r.getRow))
    filters.options.foreach {
      case ("append-paired", enabled) => if (enabled) {
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
    val rowsWithPaired = rows.filter(r => !(r.metadata.pairedID == "0"))
    val complexFilter = rowsWithPaired.map(_.metadata.pairedID).mkString(",")
    val pairedFilterRequest: List[DatabaseFilterRequest] =
      List(DatabaseFilterRequest("complex.id", DatabaseFilterType.ExactSet, negative = false, complexFilter))

    val pairedFilters: DatabaseFilters = DatabaseFilters.createFromRequest(pairedFilterRequest, database)
    val pairedTable: SearchTable = new SearchTable()
    pairedTable.update(pairedFilters, database)

    pairedTable.getRows.filter(p => !rowsWithPaired.contains(p))
  }
}

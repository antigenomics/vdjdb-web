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

package backend.server.table.search


import backend.server.database.Database
import backend.server.database.filters.DatabaseFilters

import scala.collection.JavaConverters._
import scala.math.Ordering.String

case class SearchTable(private var pageSize: Int = SearchTable.DEFAULT_PAGE_SIZE, private var rows: List[SearchTableRow] = List()) {
    private var currentPage: Int = 0

    def setPageSize(pageSize: Int): Unit = {
        this.pageSize = pageSize
    }

    def getPageSize: Int = pageSize

    def getPageCount: Int = getRecordsFound / pageSize + 1

    def getRows: List[SearchTableRow] = rows

    def getRecordsFound: Int = rows.length

    def getCurrentPage: Int = currentPage

    def getPage(page: Int): List[SearchTableRow] = {
        if (page >= 0) {
            currentPage = page
            var fromIndex: Int = pageSize * page
            fromIndex = if (fromIndex > rows.size) rows.size else fromIndex
            var toIndex: Int = pageSize * (page + 1)
            toIndex = if (toIndex > rows.size) rows.size else toIndex
            rows.slice(fromIndex, toIndex)
        } else {
            currentPage = 0
            getPage(0)
        }
    }

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
        this.rows = results.asScala.map(r => SearchTableRow.createFromRow(r.getRow)).toList
        this
    }
}

object SearchTable {
    val DEFAULT_PAGE_SIZE: Int = 25
}

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

    def getPageCount: Int = getRecordsFound / pageSize

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

    def sort(columnName: String, sortType: String): Unit = {
        if ((sortType == "desc" || sortType == "asc") && (columnName.length != 0)) {
            rows = rows.sortWith((e1, e2) => {
                val v1 = e1.entries.find(entry => entry.column == columnName).get.value
                val v2 = e2.entries.find(entry => entry.column == columnName).get.value

                sortType match {
                    case "desc" => String.gt(v1, v2)
                    case "asc" => String.lteq(v1, v2)
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

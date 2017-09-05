package backend.server.table.search_table

import backend.server.database.Database
import backend.server.filters.DatabaseFilters

import scala.collection.JavaConverters._

case class SearchTableResults(private var pageSize: Int = SearchTableResults.DEFAULT_PAGE_SIZE,
                              private var rows: List[SearchTableRow] = List()) {

    def setPageSize(pageSize: Int): Unit = {
        this.pageSize = pageSize
    }

    def getPageSize: Int = pageSize

    def getRows: List[SearchTableRow] = rows

    def getCount: Int = rows.length

    def getPage(page: Int): List[SearchTableRow] = {
        if (page >= 0) {
            var fromIndex: Int = pageSize * page
            fromIndex = if (fromIndex > rows.size) rows.size else fromIndex
            var toIndex: Int = pageSize * (page + 1)
            toIndex = if (toIndex > rows.size) rows.size else toIndex
            rows.slice(fromIndex, toIndex)
        } else {
            getPage(0)
        }
    }

    def sort(columnName: String, sortType: String): Unit = {
        rows = rows.sortWith((e1, e2) => {
            val v1 = e1.entries.find(entry => entry.column == columnName).get.value
            val v2 = e2.entries.find(entry => entry.column == columnName).get.value
            val m = v1 > v2

            sortType match {
                case "desc" => m
                case "asc" => !m
                case _ => m
            }
        })
    }

    def update(filters: DatabaseFilters, database: Database): SearchTableResults = {
        val results = database.getInstance.getDbInstance.search(filters.text, filters.sequence)
        this.rows = results.asScala.map(r => SearchTableRow.createFromRow(r.getRow)).toList
        this
    }
}

object SearchTableResults {
    val DEFAULT_PAGE_SIZE: Int = 100
}

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

package backend.server

abstract class ResultsTable[T] {
    protected var pageSize: Int = ResultsTable.DEFAULT_PAGE_SIZE
    protected var currentPage: Int = 0
    protected var rows: Seq[T] = Seq()

    def getPageSize: Int = pageSize

    def setPageSize(pageSize: Int): Unit = {
        this.pageSize = pageSize
    }

    def getPageCount: Int = Math.ceil(getRecordsFound.toDouble / pageSize).toInt

    def getRows: Seq[T] = rows

    def getRecordsFound: Int = rows.length

    def getCurrentPage: Int = currentPage

    def getPage(page: Int): Seq[T] = {
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

    def sort(columnIndex: Int, sortType: String): Unit
}

object ResultsTable {
    final val DEFAULT_PAGE_SIZE: Int = 25
}

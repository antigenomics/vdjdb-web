/*
 *     Copyright 2017 Bagaev Dmitry
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

package backend.server.table

import backend.BaseTestSpecWithApplication
import backend.server.database.Database
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}
import backend.server.search.SearchTable

class SearchTableSpec extends BaseTestSpecWithApplication {
    val database: Database = app.injector.instanceOf[Database]

    "Search table" should {

        "be able to update from request" in {
            val request: List[DatabaseFilterRequest] = List(DatabaseFilterRequest("gene", DatabaseFilterType.Exact, negative = false, "TRA"))
            val filters = DatabaseFilters.createFromRequest(request, database)

            val table = SearchTable().update(filters, database)

            table.getRecordsFound should be > 0
            table.getRows.size should be > 0
            table.getCurrentPage shouldBe 0
            table.getPageCount should be > 0
            table.getPageSize shouldBe SearchTable.DEFAULT_PAGE_SIZE
            table.getRows.foreach(_.entries should (contain ("TRA") and not contain "TRB"))
            succeed
        }

        "give the correct rows while changing pages" in {
            val request: List[DatabaseFilterRequest] = List(DatabaseFilterRequest("vdjdb.score", DatabaseFilterType.Level, negative = false, "3"))
            val filters = DatabaseFilters.createFromRequest(request, database)
            val table = SearchTable().update(filters, database)

            val testPageSizes = Seq(25, 50, 100)
            val rows = table.getRows

            for (pageSize <- testPageSizes) {
                table.setPageSize(pageSize)
                table.getPageSize shouldBe pageSize

                for (page <- 0 until table.getPageCount) {
                    val pageRows = table.getPage(page)
                    table.getCurrentPage shouldBe page

                    pageRows.zipWithIndex.foreach { case (row, index) =>
                        row shouldEqual rows(page * pageSize + index)
                    }
                }
            }

            val minusPageRows = table.getPage(-1)
            table.getCurrentPage shouldBe 0
            minusPageRows should have size table.getPageSize

            val invalidPageNumberRows = table.getPage(table.getPageCount + 10)
            invalidPageNumberRows should have size 0
        }

        "be able to sort rows" in {
            val request: List[DatabaseFilterRequest] = List(
                DatabaseFilterRequest("cdr3", DatabaseFilterType.Range, negative = false, "9:10")
            )
            val filters = DatabaseFilters.createFromRequest(request, database)
            val table = SearchTable().update(filters, database)

            for (sortType <- List("asc", "desc")) {
                for (columnIndex <- 0 to 10) {
                    table.sort(columnIndex, sortType)
                    val rows = table.getRows
                    for (recordIndex <- 0 until table.getRecordsFound) {
                        if (recordIndex != 0) {
                            val v1 = rows(recordIndex).entries(columnIndex)
                            val v2 = rows(recordIndex - 1).entries(columnIndex)
                            sortType match {
                                case "asc" => v1 should be >= v2
                                case "desc" => v1 should be <= v2
                            }
                        }
                    }
                }
            }
            succeed
        }

    }
}

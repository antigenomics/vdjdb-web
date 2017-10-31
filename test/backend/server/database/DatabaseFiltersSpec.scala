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

package backend.server.database

import backend.BaseTestSpecWithApplication
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._

class DatabaseFiltersSpec extends BaseTestSpecWithApplication {
    val database: Database = app.injector.instanceOf[Database]

    "DatabaseFilters" should {

        "be able to create filters from request" in {
            val request: List[DatabaseFilterRequest] = List(
                DatabaseFilterRequest("gene", DatabaseFilterType.Exact, negative = false, "TRA"),
                DatabaseFilterRequest("v.segm", DatabaseFilterType.ExactSet, negative = false, "TRBV9,TRBV10"),
                DatabaseFilterRequest("j.segm", DatabaseFilterType.SubstringSet, negative = false, "J8,J11"),
                DatabaseFilterRequest("cdr3", DatabaseFilterType.Pattern, negative = true, "CASLAPGATNEKLF"),
                DatabaseFilterRequest("vdjdb.score", DatabaseFilterType.Level, negative = true, "2"),
                DatabaseFilterRequest("cdr3", DatabaseFilterType.Range, negative = false, "12:13"),
                DatabaseFilterRequest("cdr3", DatabaseFilterType.Sequence, negative = false, "CASLAPGATNEKLF:1:2:3"),
                DatabaseFilterRequest("antigen.epitope", DatabaseFilterType.Sequence, negative = true, "LLFGYAVYV:2:2:2")
            )

            val filters = DatabaseFilters.createFromRequest(request, database)
            filters.warnings should have size 0

            filters.text should have size 6
            filters.text.get(0) shouldBe a [ExactTextFilter]
            filters.text.get(0).getColumnId shouldEqual "gene"
            filters.text.get(0).getNegative shouldEqual false
            filters.text.get(0).getValue shouldEqual "TRA"

            filters.text.get(1) shouldBe a [ExactSetTextFilter]
            filters.text.get(1).getColumnId shouldEqual "v.segm"
            filters.text.get(1).getNegative shouldEqual false
            filters.text.get(1).getValue shouldEqual "TRBV9,TRBV10"

            filters.text.get(2) shouldBe a [SubstringSetTextFilter]
            filters.text.get(2).getColumnId shouldEqual "j.segm"
            filters.text.get(2).getNegative shouldEqual false
            filters.text.get(2).getValue shouldEqual "J8,J11"

            filters.text.get(3) shouldBe a [PatternTextFilter]
            filters.text.get(3).getColumnId shouldEqual "cdr3"
            filters.text.get(3).getNegative shouldEqual true
            filters.text.get(3).getValue shouldEqual "CASLAPGATNEKLF"

            filters.text.get(4) shouldBe a [LevelFilter]
            filters.text.get(4).getColumnId shouldEqual "vdjdb.score"
            filters.text.get(4).getNegative shouldEqual true
            filters.text.get(4).getValue shouldEqual "2"

            filters.text.get(5) shouldBe a [MinMaxFilter]
            filters.text.get(5).getColumnId shouldEqual "cdr3"
            filters.text.get(5).asInstanceOf[MinMaxFilter].getMin shouldEqual 12
            filters.text.get(5).asInstanceOf[MinMaxFilter].getMax shouldEqual 13

            filters.sequence should have size 2
            filters.sequence.get(0) shouldBe a [SequenceFilter]
            filters.sequence.get(0).getColumnId shouldEqual "cdr3"
            filters.sequence.get(0).getQuery.toString shouldEqual "CASLAPGATNEKLF"
            filters.sequence.get(0).getTreeSearchParameters.getMaxSubstitutions shouldEqual 1
            filters.sequence.get(0).getTreeSearchParameters.getMaxInsertions shouldEqual 2
            filters.sequence.get(0).getTreeSearchParameters.getMaxDeletions shouldEqual 3

            filters.sequence.get(1) shouldBe a [SequenceFilter]
            filters.sequence.get(1).getColumnId shouldEqual "antigen.epitope"
            filters.sequence.get(1).getQuery.toString shouldEqual "LLFGYAVYV"
            filters.sequence.get(1).getTreeSearchParameters.getMaxSubstitutions shouldEqual 2
            filters.sequence.get(1).getTreeSearchParameters.getMaxInsertions shouldEqual 2
            filters.sequence.get(1).getTreeSearchParameters.getMaxDeletions shouldEqual 2
        }

        "create warnings for invalid request" in {
            val request: List[DatabaseFilterRequest] = List(
                DatabaseFilterRequest("abracadabra", DatabaseFilterType.Exact, negative = false, "test"),
                DatabaseFilterRequest("cdr3", "invalidType", negative = true, "test"),
                DatabaseFilterRequest("v.segm", DatabaseFilterType.Sequence, negative = false, "test")
            )

            val filters = DatabaseFilters.createFromRequest(request, database)
            filters.text should have size 0
            filters.sequence should have size 0
            filters.warnings should have size 3

            filters.warnings.head.toLowerCase should (include ("invalid") and include ("column"))
            filters.warnings(1).toLowerCase should (include ("invalid") and include ("type"))
            filters.warnings(2).toLowerCase should include ("sequence")
        }
    }

}

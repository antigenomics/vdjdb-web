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

import backend.BaseTestSpec
import backend.utils.UtilsTestTag

/** Modes arrive as a Set, since the filter value is a comma-separated list with no meaningful order.
  *
  * The Evidence filter decides what a reader sees when they narrow to independently supported
  * records, so the two rules worth pinning are that modes widen within a kind and that an unknown
  * mode narrows to nothing rather than silently disabling the filter.
  */
class EvidenceFiltersSpec extends BaseTestSpec {

  /** A record's evidence columns. Anything absent reads as absent, as it does on an older build. */
  private def record(values: (String, String)*): String => Option[String] = values.toMap.get

  private val supported = record(
    "evidence.structure.native"   -> "false",
    "evidence.structure.contacts" -> "true",
    "evidence.structure.quality"  -> "false")

  private val unsupported = record(
    "evidence.structure.native"   -> "false",
    "evidence.structure.contacts" -> "false",
    "evidence.structure.quality"  -> "false")

  "EvidenceFilters.matches" should {

    "let everything through when nothing was asked for" taggedAs UtilsTestTag in {
      EvidenceFilters.matches(unsupported, Set.empty[String], EvidenceFilters.StructureColumns) shouldEqual true
    }

    "keep a row satisfying the one requested mode" taggedAs UtilsTestTag in {
      EvidenceFilters.matches(supported, Set("contacts"), EvidenceFilters.StructureColumns) shouldEqual true
      EvidenceFilters.matches(supported, Set("native"), EvidenceFilters.StructureColumns) shouldEqual false
    }

    // Two boxes under one heading is a reader widening the search, not narrowing it.
    "OR the modes within a kind" taggedAs UtilsTestTag in {
      EvidenceFilters.matches(supported, Set("native", "contacts"), EvidenceFilters.StructureColumns) shouldEqual true
      EvidenceFilters.matches(unsupported, Set("native", "contacts", "quality"), EvidenceFilters.StructureColumns) shouldEqual false
    }

    // The filter arrives as free text over the API. A typo that quietly disabled it would hand back
    // unfiltered results under a heading that says they are filtered.
    "match nothing for a mode it does not know" taggedAs UtilsTestTag in {
      EvidenceFilters.matches(supported, Set("nosuchmode"), EvidenceFilters.StructureColumns) shouldEqual false
      EvidenceFilters.matches(supported, Set("nosuchmode", "contacts"), EvidenceFilters.StructureColumns) shouldEqual true
    }

    "read a column that is absent as false, not as an error" taggedAs UtilsTestTag in {
      EvidenceFilters.matches(record("unrelated" -> "true"), Set("native"), EvidenceFilters.StructureColumns) shouldEqual false
    }
  }

  "EvidenceFilters.isTrue" should {

    // The columns hold the string, and older database builds wrote it capitalised.
    "accept the value in any case, and reject anything else" taggedAs UtilsTestTag in {
      EvidenceFilters.isTrue(Some("true")) shouldEqual true
      EvidenceFilters.isTrue(Some("TRUE")) shouldEqual true
      EvidenceFilters.isTrue(Some(" True ")) shouldEqual true
      EvidenceFilters.isTrue(Some("false")) shouldEqual false
      EvidenceFilters.isTrue(Some("")) shouldEqual false
    }
  }

  "the column maps" should {

    "name the five evidence columns the database carries" taggedAs UtilsTestTag in {
      EvidenceFilters.ValidationColumns.values.toSet shouldEqual
        Set("evidence.validation.same.study", "evidence.validation.independent")
      EvidenceFilters.StructureColumns.values.toSet shouldEqual
        Set("evidence.structure.native", "evidence.structure.contacts", "evidence.structure.quality")
    }
  }
}

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

package backend.server.annotations

import backend.BaseTestSpec
import backend.actions.UtilsTestTag
import backend.server.annotations.api.filters.{AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}

/** The restrictions that used to be build inputs to a per-request `ClonotypeDatabase` and are now
  * predicates over the results of one shared index. Each one replicates a specific engine filter, and
  * a discrepancy would not fail anywhere — it would quietly return the wrong records — so each is
  * pinned here against the rule it is copying.
  */
class AnnotationRestrictionsSpec extends BaseTestSpec {

  private def parameters(species: String = "HomoSapiens", gene: String = "TRB",
                         mhc: String = "MHCI+II") =
    AnnotationsDatabaseQueryParams(species, gene, mhc, 0, None, None, None, None, None)

  private def record(species: String = "HomoSapiens", gene: String = "TRB",
                     mhcClass: String = "MHCI", score: String = "0"): String => String =
    Map("species" -> species, "gene" -> gene, "mhc.class" -> mhcClass, "vdjdb.score" -> score)

  "The database population predicate" should {

    "match species and gene the way ExactTextFilter does - ignoring case" taggedAs UtilsTestTag in {
      IntersectionTable.accepts(parameters())(record()) shouldBe true
      IntersectionTable.accepts(parameters())(record(species = "homosapiens", gene = "trb")) shouldBe true
      IntersectionTable.accepts(parameters())(record(species = "MusMusculus")) shouldBe false
      IntersectionTable.accepts(parameters())(record(gene = "TRA")) shouldBe false
    }

    "leave species or gene unrestricted when the request names neither" taggedAs UtilsTestTag in {
      // Groovy's `if (species)` in asClonotypeDatabase is false for an empty string, so no filter was
      // installed at all - which is exactly how the shared index itself is built.
      val anything = parameters(species = "", gene = "")
      IntersectionTable.accepts(anything)(record(species = "MusMusculus", gene = "TRA")) shouldBe true
      IntersectionTable.accepts(anything)(record(species = "MacacaMulatta", gene = "TRB")) shouldBe true
    }

    "restrict MHC class only when the request asks for one" taggedAs UtilsTestTag in {
      IntersectionTable.accepts(parameters(mhc = "MHCI+II"))(record(mhcClass = "MHCII")) shouldBe true
      IntersectionTable.accepts(parameters(mhc = "MHCI"))(record(mhcClass = "MHCII")) shouldBe false
      IntersectionTable.accepts(parameters(mhc = "MHCII"))(record(mhcClass = "MHCII")) shouldBe true
    }

    "not narrow the population by confidence at all" taggedAs UtilsTestTag in {
      // Confidence used to live here, because `asClonotypeDatabase` applied a LevelFilter at build
      // time. It is a post-search filter now: keeping it in the population made it the only
      // restriction that also moved the chart denominators, so two requests differing only in
      // confidence normalised against different totals while HLA or motif filters did not.
      IntersectionTable.accepts(parameters())(record(score = "")) shouldBe true
      IntersectionTable.accepts(parameters())(record(score = "0")) shouldBe true
      IntersectionTable.accepts(parameters())(record(score = "3")) shouldBe true
    }
  }

  "Segment matching" should {

    "compare genes with the allele stripped" taggedAs UtilsTestTag in {
      IntersectionTable.segmentsMatch("TRBV20-1*01", "TRBV20-1*03") shouldBe true
      IntersectionTable.segmentsMatch("TRBV20-1", "TRBV20-1*01") shouldBe true
      // Allele-only differences pass; a different gene does not.
      IntersectionTable.segmentsMatch("TRBV20-1*01", "TRBV20-2*01") shouldBe false
      IntersectionTable.segmentsMatch("TRBV20-1*01", "TRBV2*01") shouldBe false
    }

    "auto-pass when either side is unrecorded" taggedAs UtilsTestTag in {
      // "." is VDJdb's "not recorded". checkAutoPass short-circuits on it, and on an empty set - which
      // is what a bare separator splits to.
      IntersectionTable.segmentsMatch(".", "TRBV20-1*01") shouldBe true
      IntersectionTable.segmentsMatch("TRBV20-1*01", ".") shouldBe true
      IntersectionTable.segmentsMatch("TRBV7-9*01,.", "TRBV20-1*01") shouldBe true
      IntersectionTable.segmentsMatch(",", "TRBV20-1*01") shouldBe true
      IntersectionTable.segmentsMatch("TRBV20-1*01", ",") shouldBe true
    }

    "intersect comma-separated lists in either direction" taggedAs UtilsTestTag in {
      IntersectionTable.segmentsMatch("TRBV6-2*01,TRBV6-3*01", "TRBV6-3*01") shouldBe true
      IntersectionTable.segmentsMatch("TRBV6-3*01", "TRBV6-2*01,TRBV6-3*01") shouldBe true
      IntersectionTable.segmentsMatch("TRBV6-2*01,TRBV6-3*01", "TRBV11-2*01,TRBV12-3*01") shouldBe false
    }

    "upper-case both sides before comparing" taggedAs UtilsTestTag in {
      IntersectionTable.segmentsMatch("trbv20-1*01", "TRBV20-1*01") shouldBe true
      // An empty query is not the same as an unrecorded one: "".split(",") is [""], not [], so it
      // does not auto-pass - and "" matches nothing but "".
      IntersectionTable.segmentsMatch("", "TRBV20-1*01") shouldBe false
      IntersectionTable.segmentsMatch("", "") shouldBe true
    }
  }

  "The restriction list" should {

    "hold the population predicate alone until V or J matching is asked for" taggedAs UtilsTestTag in {
      def scope(matchV: Boolean, matchJ: Boolean) =
        AnnotationsSearchScope(matchV, matchJ, AnnotationsSearchScopeHammingDistance.Hamming)

      IntersectionTable.databaseRestrictions(parameters(), scope(matchV = false, matchJ = false)).size shouldEqual 1
      IntersectionTable.databaseRestrictions(parameters(), scope(matchV = true, matchJ = false)).size shouldEqual 2
      IntersectionTable.databaseRestrictions(parameters(), scope(matchV = false, matchJ = true)).size shouldEqual 2
      IntersectionTable.databaseRestrictions(parameters(), scope(matchV = true, matchJ = true)).size shouldEqual 3
    }
  }
}

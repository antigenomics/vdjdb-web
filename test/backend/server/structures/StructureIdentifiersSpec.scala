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

package backend.server.structures

import backend.BaseTestSpec
// Declared in package backend.actions despite living under test/backend/utils/.
import backend.actions.UtilsTestTag

/** No Guice application, no `Database`, no fixture directory — which is the point of having moved
  * these out of `Structures`. Runs in milliseconds.
  */
class StructureIdentifiersSpec extends BaseTestSpec {

  "StructureIdentifiers.sanitize" should {

    "take the last usable token, so a path yields its filename" taggedAs UtilsTestTag in {
      StructureIdentifiers.sanitize("structures/1abc.html").value shouldEqual "1abc"
      StructureIdentifiers.sanitize("a/b/c/9xyz").value shouldEqual "9xyz"
      StructureIdentifiers.sanitize("structures\\win\\1abc").value shouldEqual "1abc"
    }

    "strip an html suffix, case-insensitively" taggedAs UtilsTestTag in {
      StructureIdentifiers.sanitize("1abc.html").value shouldEqual "1abc"
      StructureIdentifiers.sanitize("1abc.HTML").value shouldEqual "1abc"
      // Only .html - any other suffix is part of the token and fails the pattern.
      StructureIdentifiers.sanitize("1abc.pdb") shouldBe empty
    }

    "split on every separator these cells actually use" taggedAs UtilsTestTag in {
      StructureIdentifiers.sanitize("1abc, 2def").value shouldEqual "2def"
      StructureIdentifiers.sanitize("1abc;2def").value shouldEqual "2def"
      StructureIdentifiers.sanitize("1abc|2def").value shouldEqual "2def"
      StructureIdentifiers.sanitize("pdb:2def").value shouldEqual "2def"
    }

    "accept both id shapes in use, and reject anything shorter than four characters" taggedAs UtilsTestTag in {
      StructureIdentifiers.sanitize("1abc").value shouldEqual "1abc"                    // PDB accession
      StructureIdentifiers.sanitize("pdb_12345678").value shouldEqual "pdb_12345678"    // extended
      StructureIdentifiers.sanitize("a" * 64).value shouldEqual "a" * 64                // sha256
      StructureIdentifiers.sanitize("abc") shouldBe empty
    }

    "return nothing for null, blank, or free text with no id in it" taggedAs UtilsTestTag in {
      StructureIdentifiers.sanitize(null) shouldBe empty
      StructureIdentifiers.sanitize("   ") shouldBe empty
      // The case that made evidence.structure.native an over-count before it was tightened.
      StructureIdentifiers.sanitize("Fig 9, Supp Table 5-8").value shouldEqual "Table"
    }
  }

  "StructureIdentifiers.motifClusterKey" should {

    "lower-case and pipe-join every component" taggedAs UtilsTestTag in {
      StructureIdentifiers.motifClusterKey(
        "HomoSapiens", "TRB", "GILGFVFTL", "CASSIRSSYEQYF", "TRBV19*01", "TRBJ2-7*01"
      ) shouldEqual "homosapiens|trb|gilgfvftl|cassirssyeqyf|trbv19*01|trbj2-7*01"
    }

    "refuse to build a partial key when any component is missing" taggedAs UtilsTestTag in {
      // A key from five of six fields would collide across unrelated chains rather than just
      // failing to match, which is far worse than returning nothing.
      StructureIdentifiers.motifClusterKey("HomoSapiens", "TRB", "", "CASS", "V", "J") shouldEqual ""
      StructureIdentifiers.motifClusterKey("HomoSapiens", "TRB", "GIL", "CASS", "  ", "J") shouldEqual ""
      StructureIdentifiers.motifClusterKey(null, "TRB", "GIL", "CASS", "V", "J") shouldEqual ""
    }
  }

  "StructureIdentifiers.substringPattern" should {

    "mask the flanks around a substring hit" taggedAs UtilsTestTag in {
      // The mask is always the length of the candidate: "SSY" starts at index 2 of "CASSYRF".
      StructureIdentifiers.substringPattern("CASSYRF", "SSY", substring = true) shouldEqual "XXSSYXX"
      StructureIdentifiers.substringPattern("CASSYRF", "CAS", substring = true) shouldEqual "CASXXXX"
      StructureIdentifiers.substringPattern("CASSYRF", "YRF", substring = true) shouldEqual "XXXXYRF"
    }

    "return the query alone for an exact search, or when it does not occur" taggedAs UtilsTestTag in {
      StructureIdentifiers.substringPattern("CASSYRF", "SSY", substring = false) shouldEqual "SSY"
      StructureIdentifiers.substringPattern("CASSYRF", "WWW", substring = true) shouldEqual "WWW"
      StructureIdentifiers.substringPattern("CASSYRF", "", substring = true) shouldEqual ""
    }
  }

  "StructureIdentifiers.preferredPattern" should {

    "prefer the most frequent pattern" taggedAs UtilsTestTag in {
      StructureIdentifiers.preferredPattern(Map("AAA" -> 1, "BBB" -> 5), "fallback") shouldEqual "BBB"
    }

    "break a frequency tie with the longer pattern" taggedAs UtilsTestTag in {
      StructureIdentifiers.preferredPattern(Map("AA" -> 3, "AAAA" -> 3), "fallback") shouldEqual "AAAA"
    }

    "fall back when nothing matched" taggedAs UtilsTestTag in {
      StructureIdentifiers.preferredPattern(Map.empty[String, Int], "fallback") shouldEqual "fallback"
    }
  }

  "StructureIdentifiers.chainLabels" should {

    "join both chains in a stable order" taggedAs UtilsTestTag in {
      StructureIdentifiers.chainLabels(Seq("CDR3b", "CDR3a")).value shouldEqual "CDR3a, CDR3b"
      StructureIdentifiers.chainLabels(Set("CDR3b", "CDR3a")).value shouldEqual "CDR3a, CDR3b"
    }

    "report a single chain without inventing the other" taggedAs UtilsTestTag in {
      StructureIdentifiers.chainLabels(Seq("CDR3a")).value shouldEqual "CDR3a"
      StructureIdentifiers.chainLabels(Seq("CDR3b", "CDR3b")).value shouldEqual "CDR3b"
    }

    "return nothing when nothing matched" taggedAs UtilsTestTag in {
      StructureIdentifiers.chainLabels(Seq.empty) shouldBe empty
    }
  }
}

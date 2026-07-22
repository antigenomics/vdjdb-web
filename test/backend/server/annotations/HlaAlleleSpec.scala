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

/** Every cell literal below is taken from the shipped `vdjdb.slim.txt`, including the awkward ones:
  * the comma-packed `HLA-A*02,HLA-A*02:01`, the invariant `B2M` that fills `mhc.b` on every MHC-I
  * record, and the murine/macaque genes that must never be selected by a human donor typing. */
class HlaAlleleSpec extends BaseTestSpec {
  private val donor = HlaAllele.parseAll("HLA-A*02:01")

  "HlaAllele" should {
    "parse a bare typing exactly like a prefixed one" taggedAs UtilsTestTag in {
      HlaAllele.parse("A*02:01") shouldEqual HlaAllele.parse("HLA-A*02:01")
      HlaAllele.parse("hla-a*02:01") shouldEqual HlaAllele.parse("HLA-A*02:01")
    }

    "keep at most two fields" taggedAs UtilsTestTag in {
      HlaAllele.parse("HLA-A*02:01:01:02") shouldEqual Some(HlaAllele("A", Seq("02", "01")))
    }

    "match a record typed at lower resolution than the donor" taggedAs UtilsTestTag in {
      HlaAllele.matches("HLA-A*02:01", donor) shouldBe true
      HlaAllele.matches("HLA-A*02", donor) shouldBe true
    }

    "not match a different allele of the same gene" taggedAs UtilsTestTag in {
      HlaAllele.matches("HLA-A*02:05", donor) shouldBe false
      HlaAllele.matches("HLA-B*07:02", donor) shouldBe false
    }

    "match a cell that packs several alleles" taggedAs UtilsTestTag in {
      HlaAllele.matches("HLA-A*02,HLA-A*02:01", donor) shouldBe true
    }

    "never match a non-HLA cell" taggedAs UtilsTestTag in {
      HlaAllele.matches("B2M", donor) shouldBe false
      HlaAllele.matches("H-2Db", donor) shouldBe false
      HlaAllele.matches("Mamu-A*01", donor) shouldBe false
    }

    "select nothing when the donor typing is blank" taggedAs UtilsTestTag in {
      HlaAllele.parseAll("") shouldBe empty
      HlaAllele.matches("HLA-A*02:01", HlaAllele.parseAll("")) shouldBe false
    }

    "accept a typing pasted with mixed separators" taggedAs UtilsTestTag in {
      HlaAllele.parseAll("HLA-A*02:01, B*07:02;\n DRB1*15:01") should have length 3
    }

    "treat a gene-only donor entry as the whole locus" taggedAs UtilsTestTag in {
      HlaAllele.matches("HLA-A*11:01", HlaAllele.parseAll("A")) shouldBe true
      HlaAllele.matches("HLA-B*08:01", HlaAllele.parseAll("A")) shouldBe false
    }

    "separate class II genes that share a prefix" taggedAs UtilsTestTag in {
      HlaAllele.matches("HLA-DRB1*04:01", HlaAllele.parseAll("DRB1*04:01")) shouldBe true
      HlaAllele.matches("HLA-DRB5*01:01", HlaAllele.parseAll("DRB1*01:01")) shouldBe false
    }

    "match every resolution the database actually stores for a two-digit donor entry" taggedAs UtilsTestTag in {
      // The exact seven mhc.a values production holds for B*35, including the three- and four-field
      // ones. A donor typed at two digits has to reach all of them, which is what the extra fields
      // being dropped at parse time buys.
      val donor = HlaAllele.parseAll("HLA-B*35")
      Seq("HLA-B*35", "HLA-B*35:01", "HLA-B*35:01:45", "HLA-B*35:08",
          "HLA-B*35:08:01", "HLA-B*35:42:01", "HLA-B*35:42:02")
        .foreach(cell => withClue(s"$cell: ")(HlaAllele.matches(cell, donor) shouldBe true))

      // ...and stops at the locus. B*15 is a different allele group, not a longer form of B*35.
      HlaAllele.matches("HLA-B*15:01", donor) shouldBe false
      HlaAllele.matches("HLA-A*35:01", donor) shouldBe false
    }

    "not treat a partial field as a prefix" taggedAs UtilsTestTag in {
      // Substring matching would let "B*3" pull in B*35 and B*37. Fields are compared whole, so it
      // does not - "3" is not an allele group, and quietly widening it would be a wrong answer rather
      // than a generous one.
      HlaAllele.matches("HLA-B*35:01", HlaAllele.parseAll("B*3")) shouldBe false
    }

    "report loci only for HLA cells" taggedAs UtilsTestTag in {
      HlaAllele.loci("HLA-DRB1*04:01") shouldEqual Seq("DRB1")
      HlaAllele.loci("HLA-A*02,HLA-A*02:01") shouldEqual Seq("A", "A")
      HlaAllele.loci("B2M") shouldBe empty
      HlaAllele.loci("H-2Db") shouldBe empty
    }
  }
}

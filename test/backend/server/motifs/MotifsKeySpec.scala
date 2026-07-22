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
 *
 */

package backend.server.motifs

import backend.BaseTestSpec
import backend.actions.UtilsTestTag
import tech.tablesaw.api.{StringColumn, Table}

/** The join between VDJdb records and cluster membership.
  *
  * Both halves of that key are built in `Motifs`, from two different column vocabularies, and they only
  * work if they agree exactly. This pins the agreement.
  */
class MotifsKeySpec extends BaseTestSpec {

  /** A cluster-members table holding the given rows, in the column order the real files use. */
  private def members(rows: Seq[Map[String, String]]): Table = {
    val columns = Seq("species", "gene", "antigen.epitope", "cdr3aa", "v.segm", "j.segm",
      "mhc.a", "mhc.b", "mhc.class", "cid")
    val table = Table.create("members")
    columns.foreach { name =>
      table.addColumns(StringColumn.create(name, rows.map(_.getOrElse(name, "")).toArray))
    }
    table
  }

  /** The real case this was found on: one rearrangement, one epitope, one V and one J, curated under
    * two HLA restrictions — a TCREMP cluster under B*07:02 and a TCRNET cluster under B*08:01. */
  private def row(mhcA: String, cid: String): Map[String, String] = Map(
    "species" -> "HomoSapiens", "gene" -> "TRB", "antigen.epitope" -> "RPIIRPATL",
    "cdr3aa" -> "CASSMIPDMNTEAFF", "v.segm" -> "TRBV19*01", "j.segm" -> "TRBJ1-1*01",
    "mhc.a" -> mhcA, "mhc.b" -> "B2M", "mhc.class" -> "MHCI", "cid" -> cid)

  "Motifs.buildCidLookupIndex" should {

    // The bug: without MHC in the key these two collapse to one entry, so whichever cluster was
    // indexed second was unreachable and the record for the other restriction inherited its
    // membership. A "TCREMP only" search returned the B*08:01 record, which is a TCRNET member.
    "keep restrictions of the same rearrangement apart" taggedAs UtilsTestTag in {
      val index = Motifs.buildCidLookupIndex(members(Seq(
        row("HLA-B*07:02", "H.B.RPIIRPATL.1"),
        row("HLA-B*08:01", "H.B.RPIIRPATL.2"))))

      index should have size 2
      index.values.toSet shouldBe Set("H.B.RPIIRPATL.1", "H.B.RPIIRPATL.2")
    }

    "key on every column of the shared list, and in its order" taggedAs UtilsTestTag in {
      val index = Motifs.buildCidLookupIndex(members(Seq(row("HLA-B*07:02", "H.B.RPIIRPATL.1"))))
      val expected = Seq("homosapiens", "trb", "rpiirpatl", "cassmipdmnteaff", "trbv19*01", "trbj1-1*01",
        "hla-b*07:02", "b2m", "mhci").mkString("|")
      index.keySet shouldBe Set(expected)
      // The VDJdb side names the CDR3 column `cdr3`; every other name is shared verbatim.
      Motifs.MotifKeyColumns should contain theSameElementsInOrderAs Seq("species", "gene",
        "antigen.epitope", "cdr3", "v.segm", "j.segm", "mhc.a", "mhc.b", "mhc.class")
    }

    // An incomplete key would collide with every other incomplete key.
    "drop rows with a blank key component" taggedAs UtilsTestTag in {
      Motifs.buildCidLookupIndex(members(Seq(row("", "H.B.RPIIRPATL.1")))) shouldBe empty
    }

    "drop rows with no cluster id" taggedAs UtilsTestTag in {
      Motifs.buildCidLookupIndex(members(Seq(row("HLA-B*07:02", "")))) shouldBe empty
    }

    "return an empty index when a key column is missing entirely" taggedAs UtilsTestTag in {
      val table = Table.create("members")
      table.addColumns(StringColumn.create("species", Array("HomoSapiens")))
      Motifs.buildCidLookupIndex(table) shouldBe empty
    }
  }
}

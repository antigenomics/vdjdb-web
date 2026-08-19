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
import backend.utils.UtilsTestTag
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
        "hla-b*07", "b2m", "mhci").mkString("|")
      index.keySet shouldBe Set(expected)
      // The VDJdb side names the CDR3 column `cdr3`; every other name is shared verbatim.
      Motifs.MotifKeyColumns should contain theSameElementsInOrderAs Seq("species", "gene",
        "antigen.epitope", "cdr3", "v.segm", "j.segm", "mhc.a", "mhc.b", "mhc.class")
    }

    /* A cluster-members row is always written at full allele resolution; a VDJdb record may be
     * curated at either. Comparing them verbatim silently dropped the record - measured on the
     * deployed database, 2,831 records lost their TCRNET badge and 6,603 their TCREMP badge. The
     * one that surfaced it: CASSISSTGELFF / TRBV19 / TRBJ2-2 under HLA-A*02, a member of the TCREMP
     * cluster H.B.GILGFVFTL.9, whose members row says HLA-A*02:01. */
    "meet a two-field record and a four-field cluster in the middle" taggedAs UtilsTestTag in {
      val index = Motifs.buildCidLookupIndex(members(Seq(row("HLA-B*07:02", "H.B.RPIIRPATL.1"))))
      val recordAtTwoFields = Seq("homosapiens", "trb", "rpiirpatl", "cassmipdmnteaff", "trbv19*01",
        "trbj1-1*01", "hla-b*07", "b2m", "mhci").mkString("|")

      index.get(recordAtTwoFields) shouldBe Some("H.B.RPIIRPATL.1")
    }

    // Trimming must not go so far that it undoes the reason MHC is in the key: B*07 and B*08 differ
    // in the first field, so they stay apart however the second is written.
    "still separate restrictions that differ in the first field" taggedAs UtilsTestTag in {
      val index = Motifs.buildCidLookupIndex(members(Seq(
        row("HLA-B*07:02", "H.B.RPIIRPATL.1"),
        row("HLA-B*08:01", "H.B.RPIIRPATL.2"))))

      index should have size 2
    }

    /*
     * The contract test this file was missing.
     *
     * The two halves of this join are built in different places from differently-named columns, and
     * on 2026-07-23 (#200) the members half gained mhc.a/mhc.b/mhc.class while the lookup that reads
     * it did not. Nothing failed: the index simply stopped being reachable, every cid lookup returned
     * nothing, and the motif badge went inactive on every row in Browse - silently, because "no
     * cluster for this clonotype" is also a legitimate answer.
     *
     * So the assertion is not what the key looks like, but that both sides produce the SAME key for
     * the same record. Adding a column to MotifKeyColumns without teaching both halves fails here.
     */
    "produce the same key from a VDJdb record and from its cluster-members row" taggedAs UtilsTestTag in {
      val membersRow = row("HLA-A*02:01", "H.B.GILGFVFTL.9") ++ Map(
        "antigen.epitope" -> "GILGFVFTL", "cdr3aa" -> "CASSISSTGELFF",
        "v.segm" -> "TRBV19*01", "j.segm" -> "TRBJ2-2*01")

      // The same clonotype as VDJdb curates it: CDR3 column named `cdr3`, MHC at two fields.
      val vdjdbRecord = Map(
        "species" -> "HomoSapiens", "gene" -> "TRB", "antigen.epitope" -> "GILGFVFTL",
        "cdr3" -> "CASSISSTGELFF", "v.segm" -> "TRBV19*01", "j.segm" -> "TRBJ2-2*01",
        "mhc.a" -> "HLA-A*02", "mhc.b" -> "B2M", "mhc.class" -> "MHCI")

      val fromMembers = Motifs.buildCidLookupIndex(members(Seq(membersRow))).keys.toSeq
      val fromRecord = Motifs.motifKeyOf(column => vdjdbRecord.getOrElse(column, ""))

      fromRecord shouldBe defined
      fromMembers shouldEqual Seq(fromRecord.get)
    }

    "refuse a key with a component missing, on either side" taggedAs UtilsTestTag in {
      Motifs.motifKeyOf(_ => "") shouldBe empty
      Motifs.motifKeyOf(column => if (column == "mhc.b") "" else "x") shouldBe empty
    }

    "normalize the same way on the VDJdb side of the join" taggedAs UtilsTestTag in {
      Motifs.normalizeKeyPart("mhc.a", "HLA-A*02:01") shouldEqual "hla-a*02"
      Motifs.normalizeKeyPart("mhc.b", " B2M ") shouldEqual "b2m"
      // Everything else keeps its colons: only an allele is cut.
      Motifs.normalizeKeyPart("cdr3", " CASSIRSSYEQYF ") shouldEqual "cassirssyeqyf"
      Motifs.normalizeKeyPart("antigen.epitope", "GIL:GFVFTL") shouldEqual "gil:gfvftl"
    }

    /* The two motif builds froze different spellings of the same locus, and VDJdb carries both, so the
     * join has to repair the spelling or the record and its cluster never meet. Every case below is a
     * mis-spelling rather than a variant -- `H2-Db` is the MGI symbol and `HLA-DPA1`/`HLA-DPB1` the
     * IMGT ones.
     */
    "repair a mis-spelled MHC gene symbol" taggedAs UtilsTestTag in {
      Motifs.normalizeKeyPart("mhc.a", "H-2Db") shouldEqual "h2-db"
      Motifs.normalizeKeyPart("mhc.a", "H2-Db") shouldEqual "h2-db"
      Motifs.normalizeKeyPart("mhc.a", "HLA-DPA*01:03") shouldEqual "hla-dpa1*01"
      Motifs.normalizeKeyPart("mhc.a", "HLA-DPA1*01:03") shouldEqual "hla-dpa1*01"
      Motifs.normalizeKeyPart("mhc.b", "HLA-DPB*04:01") shouldEqual "hla-dpb1*04"
    }

    // HLA-DRA is correct without a digit, and so is everything that already has one.
    "leave a well-formed gene symbol alone" taggedAs UtilsTestTag in {
      Motifs.normalizeKeyPart("mhc.a", "HLA-DRA*01:01") shouldEqual "hla-dra*01"
      Motifs.normalizeKeyPart("mhc.a", "HLA-DQA1*05:01") shouldEqual "hla-dqa1*05"
      Motifs.normalizeKeyPart("mhc.a", "Mamu-A*01") shouldEqual "mamu-a*01"
      Motifs.normalizeKeyPart("mhc.a", "I-Ab") shouldEqual "i-ab"
    }

    // 789 TCREMP entries are keyed on "HLA-A*02,HLA-A*02:01"; no VDJdb record has ever held a comma.
    "collapse an allele written twice" taggedAs UtilsTestTag in {
      Motifs.normalizeKeyPart("mhc.a", "HLA-A*02,HLA-A*02:01") shouldEqual "hla-a*02"
      Motifs.normalizeKeyPart("mhc.a", "HLA-A*02:01") shouldEqual "hla-a*02"
    }

    // Two genuinely different alleles are not a repeat and must not be collapsed to the first.
    "leave a list of different alleles alone" taggedAs UtilsTestTag in {
      Motifs.normalizeKeyPart("mhc.a", "HLA-A*02,HLA-B*07") shouldEqual "hla-a*02,hla-b*07"
    }

    "join a record to its cluster across the spelling split" taggedAs UtilsTestTag in {
      val index = Motifs.buildCidLookupIndex(
        members(Seq(row("H2-Db", "H.B.RPIIRPATL.7") + ("species" -> "MusMusculus"))))
      val vdjdbSide = Motifs.motifKeyOf(Map(
        "species" -> "MusMusculus", "gene" -> "TRB", "antigen.epitope" -> "RPIIRPATL",
        "cdr3" -> "CASSMIPDMNTEAFF", "v.segm" -> "TRBV19*01", "j.segm" -> "TRBJ1-1*01",
        // written the other way round in VDJdb, which is where 768 badges were being lost
        "mhc.a" -> "H-2Db", "mhc.b" -> "B2M", "mhc.class" -> "MHCI"))

      vdjdbSide should not be empty
      index.get(vdjdbSide.get) shouldEqual Some("H.B.RPIIRPATL.7")
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

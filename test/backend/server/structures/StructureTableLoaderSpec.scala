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

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}

import backend.BaseTestSpec
import backend.utils.UtilsTestTag
import org.scalatest.Assertion
import tech.tablesaw.api.Table

class StructureTableLoaderSpec extends BaseTestSpec {

  private def withTable(content: String)(test: Table => Assertion): Assertion = {
    val file = Files.createTempFile("structure-table-spec", ".txt")
    try {
      Files.write(file, content.getBytes(StandardCharsets.UTF_8))
      test(StructureTableLoader.load(file.toAbsolutePath.toString))
    } finally {
      Files.deleteIfExists(file)
      ()
    }
  }

  private def rows(header: Seq[String], values: Seq[Seq[String]]): String =
    (header +: values).map(_.mkString("\t")).mkString("", "\n", "\n")

  "StructureTableLoader" should {

    "skip the columns the structure browser never reads" taggedAs UtilsTestTag in
      withTable(rows(
        Seq("complex.id", "gene", "cdr3", "reference.id", "vdjdb.score"),
        Seq(Seq("1", "TRB", "CASSF", "PMID:1", "3")))) { table =>
        // At ~228k rows, skipping at parse time rather than loading and ignoring is the point.
        table.columnNames().contains("gene") shouldEqual true
        table.columnNames().contains("cdr3") shouldEqual true
        StructureTableLoader.SkippedColumns.foreach(name => table.columnNames().contains(name) shouldEqual false)
        succeed
      }

    "load a column it has never heard of rather than dropping it" taggedAs UtilsTestTag in
      withTable(rows(
        Seq("gene", "some.new.column"),
        Seq(Seq("TRB", "a value")))) { table =>
        // A skip-set, not an allow-list: a column added to vdjdb.txt after this code was written
        // still arrives. TCR_hash reached the browser exactly this way.
        table.columnNames().contains("some.new.column") shouldEqual true
        table.stringColumn("some.new.column").get(0) shouldEqual "a value"
      }

    "trim MHC alleles back to the chain" taggedAs UtilsTestTag in
      withTable(rows(
        Seq("mhc.a", "mhc.b"),
        Seq(Seq("HLA-A*02:01", "B2M:01:01")))) { table =>
        // Allele-level resolution would split one tree group into dozens of near-duplicates.
        table.stringColumn("mhc.a").get(0) shouldEqual "HLA-A*02"
        table.stringColumn("mhc.b").get(0) shouldEqual "B2M"
      }

    "synthesize the chain pair from the trimmed halves" taggedAs UtilsTestTag in
      withTable(rows(
        Seq("mhc.a", "mhc.b"),
        Seq(Seq("HLA-A*02:01", "B2M")))) { table =>
        table.stringColumn(StructureTableLoader.MhcPairColumn).get(0) shouldEqual "HLA-A*02/B2M"
      }

    "leave the pair empty when either half is missing" taggedAs UtilsTestTag in
      withTable(rows(
        Seq("mhc.a", "mhc.b"),
        Seq(Seq("HLA-A*02:01", ""), Seq("", "B2M"), Seq("HLA-A*01", "B2M")))) { table =>
        // A pair naming one chain would group structures that do not belong together.
        val pairs = table.stringColumn(StructureTableLoader.MhcPairColumn)
        pairs.get(0) shouldEqual ""
        pairs.get(1) shouldEqual ""
        pairs.get(2) shouldEqual "HLA-A*01/B2M"
      }

    "still produce the pair column when the MHC columns are absent entirely" taggedAs UtilsTestTag in
      withTable(rows(Seq("gene", "cdr3"), Seq(Seq("TRB", "CASSF")))) { table =>
        // Downstream groups by this column unconditionally, so it has to exist even when empty.
        table.columnNames().contains(StructureTableLoader.MhcPairColumn) shouldEqual true
        table.stringColumn(StructureTableLoader.MhcPairColumn).get(0) shouldEqual ""
      }
  }
}

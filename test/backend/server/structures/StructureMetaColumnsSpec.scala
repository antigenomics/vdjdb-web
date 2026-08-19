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
import backend.utils.UtilsTestTag
import tech.tablesaw.api.{StringColumn, Table}

import scala.collection.JavaConverters._

class StructureMetaColumnsSpec extends BaseTestSpec {

  private def table(columns: (String, Seq[String])*): Table =
    Table.create("rows", columns.map { case (name, values) => StringColumn.create(name, values.asJava) }: _*)

  private def ids(t: Table): Seq[String] =
    StructureMetaColumns.structureIdColumn(t).asList().asScala.toSeq

  "StructureMetaColumns.valueFromMeta" should {

    "read a literal dotted key before treating it as a path" taggedAs UtilsTestTag in {
      // meta really does carry a field named "structure.id", so flat has to be tried first.
      StructureMetaColumns.valueFromMeta("""{"structure.id":"1abc"}""", Seq("structure.id")).value shouldEqual "1abc"
    }

    "fall back to walking a dotted key into nested objects" taggedAs UtilsTestTag in {
      StructureMetaColumns.valueFromMeta("""{"structure":{"id":"1abc"}}""", Seq("structure.id")).value shouldEqual "1abc"
    }

    "take the first key that yields something" taggedAs UtilsTestTag in {
      val meta = """{"structureId":"","structure_id":"2def"}"""
      StructureMetaColumns.valueFromMeta(meta, StructureMetaColumns.StructureIdKeys).value shouldEqual "2def"
    }

    "return nothing rather than throwing on unparseable JSON" taggedAs UtilsTestTag in {
      // This used to throw from inside a val initializer, so one malformed cell arriving in a
      // database refresh took the application down at startup instead of costing that row its id.
      StructureMetaColumns.valueFromMeta("{not json", StructureMetaColumns.StructureIdKeys) shouldBe empty
      StructureMetaColumns.valueFromMeta("", StructureMetaColumns.StructureIdKeys) shouldBe empty
      StructureMetaColumns.valueFromMeta(null, StructureMetaColumns.StructureIdKeys) shouldBe empty
    }
  }

  "StructureMetaColumns.structureIdColumn" should {

    "prefer the hash column, because the files are named after it" taggedAs UtilsTestTag in {
      ids(table(
        "TCR_hash" -> Seq("HASHVALUE"),
        "meta" -> Seq("""{"structure.id":"1abc"}"""))) shouldEqual Seq("HASHVALUE")
    }

    "fall back to meta for rows that predate the hash column" taggedAs UtilsTestTag in {
      ids(table(
        "TCR_hash" -> Seq("", "HASHVALUE"),
        "meta" -> Seq("""{"structure.id":"1abc"}""", """{"structure.id":"2def"}"""))) shouldEqual
        Seq("1abc", "HASHVALUE")
    }

    "accept the old contacts column under its old name" taggedAs UtilsTestTag in {
      ids(table("contacts" -> Seq("HASHVALUE"), "meta" -> Seq(""))) shouldEqual Seq("HASHVALUE")
    }

    "keep going past a row whose meta is malformed" taggedAs UtilsTestTag in {
      // The row loses its id; the other rows and the application do not.
      ids(table("meta" -> Seq("""{"structure.id":"1abc"}""", "{ broken", """{"structure.id":"3ghi"}"""))) shouldEqual
        Seq("1abc", "", "3ghi")
    }

    "yield empty ids when neither source is present" taggedAs UtilsTestTag in {
      ids(table("gene" -> Seq("TRA", "TRB"))) shouldEqual Seq("", "")
    }
  }

  "StructureMetaColumns.derivedColumn" should {

    "lift a named field out of meta under any of its spellings" taggedAs UtilsTestTag in {
      val column = StructureMetaColumns.derivedColumn(
        table("meta" -> Seq("""{"cell.subset":"CD8"}""", """{"cellSubset":"CD4"}""", """{"unrelated":"x"}""")),
        "cell.subset", StructureMetaColumns.CellSubsetKeys)

      column.asList().asScala.toSeq shouldEqual Seq("CD8", "CD4", "")
    }
  }
}

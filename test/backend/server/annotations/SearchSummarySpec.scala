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

import java.io.{File, PrintWriter}

import backend.BaseTestSpecWithApplication
import backend.actions.UtilsTestTag
import backend.server.database.Database
import com.antigenomics.vdjdb.impl.filter.DummyResultFilter
import com.antigenomics.vdjdb.impl.weights.DummyWeightFunctionFactory
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ClonotypeSearchResult, ScoringBundle}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import com.antigenomics.vdjtools.sample.{Clonotype, Sample}

import scala.collection.JavaConverters._

/** The summary used to come from the engine's `ClonotypeSearchSummary`; it is now computed here, so
  * the numbers behind every annotation chart are this file's responsibility.
  *
  * Both halves are asserted against an independent, deliberately naive reference computed in the test
  * itself — the per-value full scan for the denominators, an explicit `distinct` for the clonotype
  * deduplication. That is the actual claim being made: the rewrite reorders the work without changing
  * the result. Comparing against hardcoded numbers would instead pin the fixture, and would go stale
  * the moment it is regenerated.
  */
class SearchSummarySpec extends BaseTestSpecWithApplication {
  private lazy val database: Database = app.injector.instanceOf[Database]

  /** The defaults `buildClonotypeDatabase` produces: human TRB, hamming 1, no V/J match, no scoring. */
  private lazy val clonotypeDatabase: ClonotypeDatabase =
    database.getInstance.asClonotypeDatabase("HomoSapiens", "TRB",
      new SearchScope(1, 0, 0, 1, false, true), ScoringBundle.getDUMMY,
      DummyWeightFunctionFactory.INSTANCE, DummyResultFilter.INSTANCE, false, false, 0, 0)

  private lazy val index: SummaryIndex = SummaryIndex.build(clonotypeDatabase, IntersectionTable.SummaryFields)

  private def cdr3Of(row: com.antigenomics.vdjdb.db.Row): String =
    row.getAt(clonotypeDatabase.getCdr3ColName).getValue

  /** A sample built out of database records, so every clonotype is guaranteed to match something.
    * `cdr3nt` is a placeholder of the right length: `ClonotypeStreamParser` silently drops rows
    * without one, and nothing in the summary path reads it. */
  private lazy val sample: Sample = {
    val file = File.createTempFile("vdjdb-summary-spec", ".txt")
    file.deleteOnExit()
    val writer = new PrintWriter(file)
    try {
      writer.println("count\tfreq\tcdr3nt\tcdr3aa\tv\td\tj\tVEnd\tDStart\tDEnd\tJStart")
      clonotypeDatabase.getRows.asScala.take(20).zipWithIndex.foreach { case (row, i) =>
        val cdr3 = cdr3Of(row)
        writer.println(s"${100 - i}\t0.05\t${"A" * (cdr3.length * 3)}\t$cdr3\t" +
          s"${row.getAt(clonotypeDatabase.getvColName).getValue}\t.\t" +
          s"${row.getAt(clonotypeDatabase.getjColName).getValue}\t-1\t-1\t-1\t-1")
      }
    } finally {
      writer.close()
    }
    new SampleFileConnection(file.getAbsolutePath, Software.VDJtools).getSample
  }

  private lazy val found: Seq[(Clonotype, Seq[ClonotypeSearchResult])] =
    clonotypeDatabase.search(sample).asScala.toList.map { case (c, hits) => (c, hits.asScala.toList) }

  "SummaryIndex" should {
    "count the same distinct CDR3s per value as a per-value full scan" taggedAs UtilsTestTag in {
      val rows = clonotypeDatabase.getRows.asScala
      val reference = IntersectionTable.SummaryFields.map { field =>
        field -> rows.groupBy(_.getAt(field).getValue)
          .map { case (value, group) => value -> group.map(cdr3Of).toSet.size.toLong }
      }.toMap
      index.perColumn shouldEqual reference
    }

    "count every distinct CDR3 in the database once" taggedAs UtilsTestTag in {
      index.databaseCdr3Count shouldEqual clonotypeDatabase.getRows.asScala.map(cdr3Of).toSet.size.toLong
    }

    "hold one entry per summary field and nothing else" taggedAs UtilsTestTag in {
      index.perColumn.keySet shouldEqual IntersectionTable.SummaryFields.toSet
    }
  }

  "SearchSummary" should {
    "count each clonotype once per field value however many records it matched" taggedAs UtilsTestTag in {
      val (counters, _) = SearchSummary.summarize(found, sample, IntersectionTable.SummaryFields, index)
      val reference = IntersectionTable.SummaryFields.map { field =>
        field -> found.flatMap { case (clonotype, hits) =>
          hits.map(hit => (hit.getRow.getAt(field).getValue, clonotype))
        }.distinct.groupBy(_._1).map { case (value, pairs) => value -> pairs.size }
      }.toMap
      val actual = counters.map { field =>
        field.name -> field.counters.map(counter => counter.field -> counter.unique).toMap
      }.toMap
      actual shouldEqual reference
    }

    "take the denominators from the index" taggedAs UtilsTestTag in {
      val (counters, _) = SearchSummary.summarize(found, sample, IntersectionTable.SummaryFields, index)
      val disagreeing = counters.flatMap { field =>
        field.counters.filterNot(counter => counter.databaseUnique == index.perColumn(field.name)(counter.field))
      }
      disagreeing shouldBe empty
    }

    "report nothing unmatched when every clonotype matched" taggedAs UtilsTestTag in {
      // Every CDR3 in the sample was copied out of a database record and V/J matching is off, so an
      // exact hit is guaranteed for all of them; a non-zero count here means the summary lost one.
      val (_, notFound) = SearchSummary.summarize(found, sample, IntersectionTable.SummaryFields, index)
      notFound.unique shouldEqual 0
      notFound.reads shouldEqual 0L
      notFound.frequency shouldEqual 0.0 +- 1e-9
      notFound.databaseUnique shouldEqual index.databaseCdr3Count
    }

    "report the whole sample as unmatched when nothing matched" taggedAs UtilsTestTag in {
      val (counters, notFound) = SearchSummary.summarize(Seq.empty, sample, IntersectionTable.SummaryFields, index)
      counters.flatMap(_.counters) shouldBe empty
      notFound.unique shouldEqual sample.getDiversity
      notFound.reads shouldEqual sample.getCount
      notFound.frequency shouldEqual sample.getFreq +- 1e-9
    }
  }
}

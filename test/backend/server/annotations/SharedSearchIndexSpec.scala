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

import backend.BaseTestSpecWithApplication
import backend.server.annotations.api.filters.{AnnotationsAnnotateScoring, AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance, AnnotationsVDJMatchScoringHitFilteringOptions, AnnotationsVDJMatchScoringOptions}
import backend.server.database.Database
import com.antigenomics.vdjdb.db.Row
import com.antigenomics.vdjdb.impl.filter.DummyResultFilter
import com.antigenomics.vdjdb.impl.weights.DummyWeightFunctionFactory
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ScoringBundle}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjdb.text.{ExactTextFilter, SegmentFilter, TextFilter}

import scala.collection.JavaConverters._

/** The one thing this change has to get right: one index over every row, narrowed afterwards, must
  * return what a per-request index built with those restrictions returned.
  *
  * Every assertion below is differential against the engine itself — a database built the old way, or
  * the engine's own `SegmentFilter` — rather than against numbers written down here, so it stays honest
  * if the fixture is regenerated.
  */
class SharedSearchIndexSpec extends BaseTestSpecWithApplication {
  private val database: Database = app.injector.instanceOf[Database]

  private val scoring = AnnotationsAnnotateScoring(AnnotationsAnnotateScoring.SIMPLE,
    AnnotationsVDJMatchScoringOptions(1, 1,
      AnnotationsVDJMatchScoringHitFilteringOptions(50, "top", 3, weightByInfo = false)))

  private def parameters(species: String = "HomoSapiens", gene: String = "TRB",
                         mhc: String = "MHCI+II", confidenceThreshold: Int = 0) =
    AnnotationsDatabaseQueryParams(species, gene, mhc, confidenceThreshold, 0, None, None, None, None, None)

  private def searchScope(matchV: Boolean = false, matchJ: Boolean = false) =
    AnnotationsSearchScope(matchV, matchJ, AnnotationsSearchScopeHammingDistance.Hamming)

  /** The one index the whole application now searches. */
  private lazy val shared: ClonotypeDatabase =
    IntersectionTable.indexesFor(database, parameters(), searchScope(), scoring)._1

  /** A `ClonotypeDatabase` built the way every request used to build one, for the same search scope. */
  private def legacyIndex(species: String, gene: String, mhc: String, confidence: Int,
                          matchV: Boolean, matchJ: Boolean): ClonotypeDatabase = {
    val filters = new java.util.ArrayList[TextFilter]()
    if (mhc != "MHCI+II") {
      filters.add(new ExactTextFilter("mhc.class", mhc, false))
    }
    val hamming = AnnotationsSearchScopeHammingDistance.Hamming
    database.getInstance.filter(filters).asClonotypeDatabase(species, gene,
      new SearchScope(hamming.substitutions, hamming.deletions, hamming.insertions, hamming.total, false, false),
      ScoringBundle.getDUMMY, DummyWeightFunctionFactory.INSTANCE, DummyResultFilter.INSTANCE,
      matchV, matchJ, confidence, 0)
  }

  private def valueAt(row: Row, column: String): String = row.getAt(column).getValue

  /** Rows are copies in the legacy index and originals in the shared one, and `Row.equals` compares the
    * row's position in its own database — so the two are only comparable by their contents. */
  private def contents(rows: Seq[Row]): Seq[String] = rows.map(_.toTabDelimitedString).sorted

  private lazy val rows: Seq[Row] = shared.getRows.asScala.toList

  private def humanTrb(row: Row): Boolean =
    valueAt(row, "species") == "HomoSapiens" && valueAt(row, "gene") == "TRB"

  /** Distinct CDR3s per epitope, counted straight off the rows rather than through `SummaryIndex`. */
  private def expectedPerEpitope(accept: Row => Boolean): Map[String, Long] =
    rows.filter(accept)
      .groupBy(row => valueAt(row, "antigen.epitope"))
      .map { case (epitope, matching) => epitope -> matching.map(row => valueAt(row, "cdr3")).distinct.size.toLong }

  /** Queries taken from the database itself, so every one of them is guaranteed to match something.
    * Amino-acid CDR3s only: `search` builds an `AminoAcidSequence` from the string and throws on
    * anything else, and VDJdb carries a handful of unfixed records. */
  private lazy val queries: Seq[(String, String, String)] =
    rows.filter(humanTrb)
      .map(row => (valueAt(row, "v.segm"), valueAt(row, "j.segm"), valueAt(row, "cdr3")))
      .filter { case (_, _, cdr3) => cdr3.matches("[ACDEFGHIKLMNPQRSTVWY]+") }
      .distinct
      .take(50)

  "The shared search index" should {

    "hold every row of the database, not one species and gene" in {
      rows.map(row => valueAt(row, "gene")).distinct.size should be > 1
      rows.map(row => valueAt(row, "species")).distinct.size should be > 1
      rows.size should be > rows.count(humanTrb)
    }

    "be the same object for the same scope, and a different one per scope" in {
      val hamming     = IntersectionTable.indexesFor(database, parameters(), searchScope(), scoring)._1
      val levenshtein = IntersectionTable.indexesFor(database,
        parameters(species = "MusMusculus", gene = "TRA"),
        AnnotationsSearchScope(matchV = false, matchJ = false, AnnotationsSearchScopeHammingDistance.Levenshtein),
        scoring)._1

      // Species and gene changed and the index did not: they are predicates over results now.
      hamming should be theSameInstanceAs shared
      levenshtein should not be theSameInstanceAs(shared)
    }

    "find exactly what a species, gene, MHC and confidence filtered index found" in {
      Seq(("HomoSapiens", "TRB", "MHCI+II", 0),
          ("HomoSapiens", "TRB", "MHCI", 0),
          ("HomoSapiens", "TRA", "MHCII", 0),
          ("HomoSapiens", "TRB", "MHCI+II", 1),
          ("MusMusculus", "TRB", "MHCI+II", 0)).map { case (species, gene, mhc, confidence) =>
        val request = parameters(species, gene, mhc, confidence)
        val legacy  = legacyIndex(species, gene, mhc, confidence, matchV = false, matchJ = false)

        queries.map { case (v, j, cdr3) =>
          val fromShared = shared.search(v, j, cdr3).asScala.toList
            .map(_.getRow)
            .filter(row => IntersectionTable.accepts(request)(column => valueAt(row, column)))
          val fromLegacy = legacy.search(v, j, cdr3).asScala.toList.map(_.getRow)
          contents(fromShared) shouldEqual contents(fromLegacy)
        }.last
      }.last
    }

    "find exactly what a V and J matching index found" in {
      // matchV/matchJ were never index inputs - the engine built a SegmentFilter per search from the
      // query clonotype - so this is the same comparison with the segment rule applied by hand.
      val request = parameters()
      val legacy  = legacyIndex("HomoSapiens", "TRB", "MHCI+II", 0, matchV = true, matchJ = true)

      queries.map { case (v, j, cdr3) =>
        val fromShared = shared.search(v, j, cdr3).asScala.toList
          .map(_.getRow)
          .filter(row => IntersectionTable.accepts(request)(column => valueAt(row, column)))
          .filter(row => IntersectionTable.segmentsMatch(v, valueAt(row, "v.segm")))
          .filter(row => IntersectionTable.segmentsMatch(j, valueAt(row, "j.segm")))
        val fromLegacy = legacy.search(v, j, cdr3).asScala.toList.map(_.getRow)
        contents(fromShared) shouldEqual contents(fromLegacy)
      }.last
    }

    "reproduce SegmentFilter on every row of the database" in {
      // Straight against the engine's own filter, including the cases the search above is unlikely to
      // reach: an unrecorded segment on either side, a bare allele, mixed case, a multi-gene call.
      val probes = Seq("TRBV20-1*01", "TRBV20-1", "trbv20-1*01", "TRBV6-2*01,TRBV6-3*01",
        "TRBV7-9*01,.", ".", "", ",", "TRAV12-2*01", "TRBJ2-7*01")

      probes.map { probe =>
        Seq("v.segm", "j.segm").map { column =>
          val filter = new SegmentFilter(column, probe)
          rows.map { row =>
            IntersectionTable.segmentsMatch(probe, valueAt(row, column)) shouldEqual filter.pass(row.getAt(column))
          }.last
        }.last
      }.last
    }
  }

  "The summary denominators" should {

    "count only the population the request restricts the database to" in {
      val restricted = IntersectionTable.indexesFor(database, parameters(), searchScope(), scoring)._2

      restricted.perColumn("antigen.epitope") shouldEqual expectedPerEpitope(humanTrb)
      restricted.databaseCdr3Count shouldEqual
        rows.filter(humanTrb).map(row => valueAt(row, "cdr3")).distinct.size.toLong
    }

    "not silently widen to the whole shared index" in {
      // The failure this guards against: computing the denominators over every row of the shared index
      // would span every species and gene at once, and no assertion anywhere would have noticed.
      val restricted   = IntersectionTable.indexesFor(database, parameters(), searchScope(), scoring)._2
      val unrestricted = IntersectionTable.indexesFor(database,
        parameters(species = "", gene = ""), searchScope(), scoring)._2

      restricted.databaseCdr3Count should be < unrestricted.databaseCdr3Count
      unrestricted.perColumn("antigen.epitope") shouldEqual expectedPerEpitope(_ => true)

      // At least one epitope is carried by more than one species or gene, so the two genuinely differ
      // per value and not only in the total.
      val widened = restricted.perColumn("antigen.epitope").keySet
        .filter(epitope => unrestricted.perColumn("antigen.epitope")(epitope) >
          restricted.perColumn("antigen.epitope")(epitope))
      widened.nonEmpty shouldBe true
    }

    "answer the ground-truth epitopes exactly" in {
      // Two human TRB epitopes from the fixture, whose CDR3s appear under no other epitope anywhere in
      // it: 3 distinct CDR3s and 5. Regenerating the fixture may move these; the assertion above is the
      // one that has to hold, this one is here because a hand-checked number catches a whole class of
      // off-by-population mistakes that a self-consistent comparison cannot.
      val index = IntersectionTable.indexesFor(database, parameters(), searchScope(), scoring)._2
      index.perColumn("antigen.epitope")("KAFSPEVIPMF") shouldEqual 3L
      index.perColumn("antigen.epitope")("KRWIILGLNK") shouldEqual 5L
    }
  }
}

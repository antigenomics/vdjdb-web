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

import java.util

import backend.server.ResultsTable
import backend.server.annotations.api.annotate.SampleAnnotateRequest
import backend.server.annotations.api.filters.{AnnotationsAnnotateScoring, AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryCounters, SummaryFieldCounter}
import backend.server.database.Database
import com.antigenomics.vdjdb.impl.filter.{DummyResultFilter, MaxScoreResultFilter, TopNResultFilter}
import com.antigenomics.vdjdb.impl.weights.{DegreeWeightFunctionFactory, DummyWeightFunctionFactory}
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ClonotypeSearchResult, ScoringBundle, ScoringProvider}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjdb.stat.ClonotypeSearchSummary
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjtools.sample.{Clonotype, Sample}

import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.math.Ordering.String

class IntersectionTable(var summary: Option[SummaryCounters] = None) extends ResultsTable[IntersectionTableRow] {

  def sort(columnIndex: Int, sortType: String): Unit = {
    if ((sortType == "desc" || sortType == "asc") && (columnIndex >= 0)) {
      rows = rows.sortWith((e1, e2) => {
        val v1 = e1.entries(columnIndex)
        val v2 = e2.entries(columnIndex)
        sortType match {
          case "desc" => String.gt(v1, v2)
          case "asc" => String.lt(v1, v2)
        }
      })
    }
  }

  def update(request: SampleAnnotateRequest, sample: Sample, database: Database): IntersectionTable = {
    val instance = IntersectionTable.createClonotypeDatabase(database, request.databaseQueryParams, request.searchScope, request.scoring)
    val donor    = HlaAllele.parseAll(request.databaseQueryParams.hla.getOrElse(""))

    val raw = instance.search(sample)
    val found = raw.asScala.toList
      .map { case (clonotype, hits) => (clonotype, hits.asScala.toList.filter(IntersectionTable.allowedForDonor(_, donor))) }
      .filter { case (_, hits) => hits.nonEmpty }
      .sortWith { case ((c1, _), (c2, _)) => c1.getFreq > c2.getFreq }

    this.rows = found.map(IntersectionTableRow.createFromSearchResult)

    // Summarize what the user is actually shown: with a donor typing set, the unmatched tally has to
    // grow by the clonotypes the HLA filter removed, which only happens if the summary sees the
    // filtered map.
    val summarized = if (donor.isEmpty) raw else found.map { case (clonotype, hits) => clonotype -> hits.asJava }.toMap.asJava
    val summary    = new ClonotypeSearchSummary(summarized, sample, ClonotypeSearchSummary.FIELDS_STARBURST, instance)
    val counters = summary.fieldCounters.asScala.map { case (name, map) =>
      SummaryFieldCounter(name, map.asScala.filter(v => v._2.getUnique != 0).map { case (field, value) =>
        SummaryClonotypeCounter(field, value.getUnique, value.getDatabaseUnique, value.getFrequency, value.getReads)
      }.toSeq)
    }.toSeq

    val nfc = summary.getNotFoundCounter
    this.summary = Some(SummaryCounters(
      counters :+ IntersectionTable.summarizeByHlaLocus(found),
      SummaryClonotypeCounter("notFound", nfc.getUnique, nfc.getDatabaseUnique, nfc.getFrequency, nfc.getReads),
      IntersectionTable.summarizeAnnotated(found)))

    this.currentPage = 0
    this
  }
}

object IntersectionTable {
  // MHC-I records carry the HLA in mhc.a and the invariant B2M in mhc.b; MHC-II records carry a real
  // allele in both. A donor matches on either, which no shipped TextFilter can express: filters are
  // bound one per column and ANDed, so an OR across two columns is only available here.
  private final val MhcColumns: Seq[String] = Seq("mhc.a", "mhc.b")

  private def allowedForDonor(hit: ClonotypeSearchResult, donor: Seq[HlaAllele]): Boolean =
    donor.isEmpty || MhcColumns.exists(column => HlaAllele.matches(hit.getRow.getAt(column).getValue, donor))

  /** Matches broken down by HLA locus.
    *
    * Not derivable on the client from the `mhc.a`/`mhc.b` counters the engine already produces: those
    * are per allele, so a clonotype matching both an `HLA-A*02` and an `HLA-A*02:01` record would be
    * counted twice under locus A. Accumulating here counts each clonotype once per locus.
    *
    * `databaseUnique` is left at 0 — a whole-database denominator per locus would need its own scan of
    * the database and is only used by one optional chart normalization.
    */
  private def summarizeByHlaLocus(found: Seq[(Clonotype, Seq[ClonotypeSearchResult])]): SummaryFieldCounter = {
    val counts = mutable.LinkedHashMap.empty[String, (Int, Double, Long)]
    found.foreach { case (clonotype, hits) =>
      val loci = hits.flatMap(hit => MhcColumns.flatMap(column => HlaAllele.loci(hit.getRow.getAt(column).getValue))).distinct
      loci.foreach { locus =>
        val (unique, frequency, reads) = counts.getOrElse(locus, (0, 0.0, 0L))
        counts(locus) = (unique + 1, frequency + clonotype.getFreq, reads + clonotype.getCount.toLong)
      }
    }
    SummaryFieldCounter("mhc.locus", counts.map {
      case (locus, (unique, frequency, reads)) => SummaryClonotypeCounter(locus, unique, 0L, frequency, reads)
    }.toSeq)
  }

  def summarizeAnnotated(found: Seq[(Clonotype, Seq[ClonotypeSearchResult])]): SummaryClonotypeCounter =
    SummaryClonotypeCounter("annotated", found.size,
      found.flatMap { case (_, hits) => hits.map(_.getRow) }.distinct.size.toLong,
      found.map { case (clonotype, _) => clonotype.getFreq }.sum,
      found.map { case (clonotype, _) => clonotype.getCount.toLong }.sum)

  def createClonotypeDatabase(database: Database, parameters: AnnotationsDatabaseQueryParams,
                              searchScope: AnnotationsSearchScope, scoring: AnnotationsAnnotateScoring): ClonotypeDatabase = {
    val hdistance = AnnotationsSearchScopeHammingDistance.sanitize(searchScope.hammingDistance)
    val scope = new SearchScope(hdistance.substitutions, hdistance.deletions, hdistance.insertions, hdistance.total,
      scoring.`type` == AnnotationsAnnotateScoring.VDJMATCH && scoring.vdjmatch.exhaustiveAlignment > 0,
      scoring.`type` == AnnotationsAnnotateScoring.VDJMATCH && scoring.vdjmatch.exhaustiveAlignment < 2)
    val filters = new util.ArrayList[TextFilter]()
    if (parameters.mhc != "MHCI+II") {
      filters.add(new ExactTextFilter("mhc.class", parameters.mhc, false))
    }

    val scoringBundle = scoring.`type` match {
      case AnnotationsAnnotateScoring.VDJMATCH => ScoringProvider.loadScoringBundle(parameters.species, parameters.gene, scoring.vdjmatch.scoringMode == 0)
      case _ => ScoringBundle.getDUMMY
    }

    val weightFunction = scoring.`type` match {
      case AnnotationsAnnotateScoring.VDJMATCH =>
        if (scoring.vdjmatch.hitFiltering.weightByInfo) DegreeWeightFunctionFactory.DEFAULT else DummyWeightFunctionFactory.INSTANCE
      case _ => DummyWeightFunctionFactory.INSTANCE
    }

    val resultFilter = scoring.`type` match {
      case AnnotationsAnnotateScoring.VDJMATCH =>
        scoring.vdjmatch.hitFiltering.hitType match {
          case "best" => new MaxScoreResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f)
          case "top" => new TopNResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f, scoring.vdjmatch.hitFiltering.topHitsCount)
          case "all" => new TopNResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f, 1000)
          case _ => DummyResultFilter.INSTANCE
        }
      case _ => DummyResultFilter.INSTANCE
    }

    database.getInstance.filter(filters).asClonotypeDatabase(parameters.species, parameters.gene, scope, scoringBundle,
      weightFunction, resultFilter, searchScope.matchV, searchScope.matchJ, parameters.confidenceThreshold, parameters.minEpitopeSize)
  }
}

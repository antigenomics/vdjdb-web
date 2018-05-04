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

package backend.server.annotations

import java.util

import backend.server.ResultsTable
import backend.server.annotations.api.annotate.SampleAnnotateRequest
import backend.server.annotations.api.filters.{AnnotationsAnnotateScoring, AnnotationsDatabaseQueryParams, AnnotationsSearchScope}
import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryCounters, SummaryFieldCounter}
import backend.server.database.Database
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ScoringBundle, ScoringProvider}
import com.antigenomics.vdjdb.impl.filter.{DummyResultFilter, MaxScoreResultFilter, TopNResultFilter}
import com.antigenomics.vdjdb.impl.weights.{DegreeWeightFunctionFactory, DummyWeightFunctionFactory}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjdb.stat.ClonotypeSearchSummary
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjtools.sample.Sample

import scala.collection.JavaConverters._
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

        val results = instance.search(sample)
        this.rows = results
            .asScala.toList
            .sortWith { case ((c1, _), (c2, _)) => c1.getFreq > c2.getFreq }
            .map { case (c, l) => (c, l.asScala) }
            .map(IntersectionTableRow.createFromSearchResult)

        val summary = new ClonotypeSearchSummary(results, sample, ClonotypeSearchSummary.FIELDS_STARBURST, instance)
        val counters = summary.fieldCounters.asScala.map { case (name, map) =>
            SummaryFieldCounter(name, map.asScala.filter(v => v._2.getUnique != 0).map { case (field, value) =>
                SummaryClonotypeCounter(field, value.getUnique, value.getDatabaseUnique, value.getFrequency)
            }.toSeq)
        }.toSeq

        val nfc = summary.getNotFoundCounter
        this.summary = Some(SummaryCounters(counters, SummaryClonotypeCounter("notFound", nfc.getUnique, nfc.getDatabaseUnique, nfc.getFrequency)))

        this.currentPage = 0
        this
    }
}

object IntersectionTable {
    def createClonotypeDatabase(database: Database, parameters: AnnotationsDatabaseQueryParams,
                                searchScope: AnnotationsSearchScope, scoring: AnnotationsAnnotateScoring): ClonotypeDatabase = {
        val hdistance = searchScope.hammingDistance
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
                if (scoring.vdjmatch.hitFiltering.bestHit) {
                    new MaxScoreResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f)
                } else {
                    new TopNResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f, scoring.vdjmatch.hitFiltering.topHitsCount)
                }
            case _ => DummyResultFilter.INSTANCE
        }

        database.getInstance.filter(filters).asClonotypeDatabase(parameters.species, parameters.gene, scope, scoringBundle,
            weightFunction, resultFilter, searchScope.matchV, searchScope.matchJ, parameters.confidenceThreshold, parameters.minEpitopeSize)
    }
}

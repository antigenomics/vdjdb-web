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
import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryCounters, SummaryFieldCounter}
import backend.server.database.Database
import com.antigenomics.vdjdb.impl.ScoringBundle
import com.antigenomics.vdjdb.impl.filter.{DummyResultFilter, ResultFilter}
import com.antigenomics.vdjdb.impl.weights.{DegreeWeightFunction, DegreeWeightFunctionFactory, DummyWeightFunctionFactory, WeightFunctionFactory}
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
        val scope = request.hammingDistance match {
            case 0 => new SearchScope(0, 0, 0, 0)
            case 1 => new SearchScope(1, 0, 0, 1)
            case 2 => new SearchScope(2, 0, 0, 2)
            case 3 => new SearchScope(3, 0, 0, 3)
            case _ => new SearchScope(0, 0, 0, 0)
        }

        val filters = new util.ArrayList[TextFilter]()
        if (request.mhc != "MHCI+II") {
            filters.add(new ExactTextFilter("mhc.class", request.mhc, false))
        }

        val instance = database.getInstance.filter(filters)
            .asClonotypeDatabase(request.species, request.gene, scope,
                ScoringBundle.getDUMMY, DegreeWeightFunctionFactory.DEFAULT, DummyResultFilter.INSTANCE,
                request.matchV, request.matchJ, request.confidenceThreshold, request.minEpitopeSize)

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

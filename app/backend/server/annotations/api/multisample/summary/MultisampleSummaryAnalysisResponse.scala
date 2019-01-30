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

package backend.server.annotations.api.multisample.summary

import backend.server.annotations.charts.summary.SummaryCounters
import play.api.libs.json.{Json, Writes}

case class MultisampleSummaryAnalysisResponse(tabID: Int, state: String, summary: Map[String, SummaryCounters]) {}

object MultisampleSummaryAnalysisResponse {
    implicit val multipleSummaryAnalysisResponseWrites: Writes[MultisampleSummaryAnalysisResponse] = Json.writes[MultisampleSummaryAnalysisResponse]

    final def ParseState(tabID: Int, sample: String) = MultisampleSummaryAnalysisResponse(tabID, s"parse:${sample}", Map())
    final def AnnotateState(tabID: Int, sample: String) = MultisampleSummaryAnalysisResponse(tabID, s"annotate:${sample}", Map())
    final def LoadingState(tabID: Int) = MultisampleSummaryAnalysisResponse(tabID, "loading", Map())

    final def CompletedState(tabID: Int, summary: Map[String, SummaryCounters]) = MultisampleSummaryAnalysisResponse(tabID, "completed", summary)

    final val Action: String = "multiple-summary"
}
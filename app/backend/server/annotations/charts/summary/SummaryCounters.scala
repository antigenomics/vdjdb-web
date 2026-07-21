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

package backend.server.annotations.charts.summary

import play.api.libs.json.{Json, Writes}

/** @param annotated totals over everything that matched: `unique` is the number of annotated
  *                  clonotypes, `reads` the summed count, `databaseUnique` the number of distinct
  *                  VDJdb records they hit.
  */
case class SummaryCounters(counters: Seq[SummaryFieldCounter], notFoundCounter: SummaryClonotypeCounter,
                           annotated: SummaryClonotypeCounter)

object SummaryCounters {
  implicit val summaryCountersWrites: Writes[SummaryCounters] = Json.writes[SummaryCounters]
}

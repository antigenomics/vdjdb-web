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

/** @param unique  number of matched sample clonotypes — the row count for this field value
  * @param reads   summed clonotype `count` (the AIRR `duplicate_count`) over those clonotypes.
  *                The engine has always tallied this; it was simply dropped on the way to the client,
  *                which is why the "weight by read count" chart option was in fact weighting by
  *                frequency.
  * @param species the antigen species this value belongs to, set for `antigen.epitope` counters only
  *                and `None` everywhere else. The client colours epitope bars by it, which it cannot
  *                derive on its own: the species counters are a sibling breakdown of the same matches,
  *                so they say how many clonotypes hit each species but not which epitope belongs to
  *                which. Omitted from the JSON when `None`.
  */
case class SummaryClonotypeCounter(field: String, unique: Int, databaseUnique: Long, frequency: Double, reads: Long,
                                   species: Option[String] = None)

object SummaryClonotypeCounter {
  implicit val summaryClonotypeCounterWrites: Writes[SummaryClonotypeCounter] = Json.writes[SummaryClonotypeCounter]
}

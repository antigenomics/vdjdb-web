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

package backend.server.annotations.api.annotate

import backend.server.annotations.IntersectionTableRow
import backend.server.annotations.charts.summary.SummaryCounters
import play.api.libs.json.{Json, Writes}

case class SampleAnnotateResponse(state: String, rows: Seq[IntersectionTableRow], summary: Option[SummaryCounters],
                                  position: Option[Int] = None)

object SampleAnnotateResponse {
  final val Action: String = "intersect"

  final val ParseState = SampleAnnotateResponse("parse", Seq(), None)
  final val AnnotateState = SampleAnnotateResponse("annotate", Seq(), None)
  final val LoadingState = SampleAnnotateResponse("loading", Seq(), None)

  /** Sent while the job waits for a slot, and again whenever its position improves. Distinct from the
    * other states because it is the one that does not mean "work is happening": without it a queued
    * annotation is indistinguishable from a hung one. */
  final def QueuedState(position: Int) = SampleAnnotateResponse("queued", Seq(), None, Some(position))

  final def CompletedState(rows: Seq[IntersectionTableRow], summary: Option[SummaryCounters]) = SampleAnnotateResponse("completed", rows, summary)

  implicit val sampleIntersectionResponseWrites: Writes[SampleAnnotateResponse] = Json.writes[SampleAnnotateResponse]
}

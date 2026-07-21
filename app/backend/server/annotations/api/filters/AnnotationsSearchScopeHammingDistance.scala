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

package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

case class AnnotationsSearchScopeHammingDistance(substitutions: Int, insertions: Int, deletions: Int, total: Int)

object AnnotationsSearchScopeHammingDistance {
  // The tree walk grows exponentially with the number of allowed edits, and nothing stops a client
  // from posting whatever it likes — the whole search scope arrives as plain JSON. These are the
  // ceilings the server enforces regardless of what was asked for; past them the hits also stop being
  // biologically meaningful.
  final val MaxSubstitutions = 3
  final val MaxInsertions    = 1
  final val MaxDeletions     = 1
  final val MaxTotal         = 4

  implicit val annotationsSearchScopeHammingDistanceFormat: Format[AnnotationsSearchScopeHammingDistance] = Json.format[AnnotationsSearchScopeHammingDistance]

  /** Clamp a client-supplied scope into what we are willing to run.
    *
    * Besides the per-category caps this raises `total` to at least the largest single allowance: a
    * `total` below `substitutions` is not a stricter search, it silently degrades the whole query to
    * the smaller budget, which looks to the user like the database is missing records.
    */
  def sanitize(distance: AnnotationsSearchScopeHammingDistance): AnnotationsSearchScopeHammingDistance = {
    val substitutions = clamp(distance.substitutions, MaxSubstitutions)
    val insertions    = clamp(distance.insertions, MaxInsertions)
    val deletions     = clamp(distance.deletions, MaxDeletions)
    val total         = math.max(clamp(distance.total, MaxTotal), math.max(substitutions, math.max(insertions, deletions)))
    AnnotationsSearchScopeHammingDistance(substitutions, insertions, deletions, total)
  }

  private def clamp(value: Int, max: Int): Int = math.max(0, math.min(value, max))
}

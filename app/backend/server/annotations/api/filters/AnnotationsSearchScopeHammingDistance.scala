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
  /** One substitution, no indels. */
  final val Hamming: AnnotationsSearchScopeHammingDistance =
    AnnotationsSearchScopeHammingDistance(substitutions = 1, insertions = 0, deletions = 0, total = 1)

  /** One edit of any kind. `total = 1` is what makes it *one* edit rather than one of each. */
  final val Levenshtein: AnnotationsSearchScopeHammingDistance =
    AnnotationsSearchScopeHammingDistance(substitutions = 1, insertions = 1, deletions = 1, total = 1)

  implicit val annotationsSearchScopeHammingDistanceFormat: Format[AnnotationsSearchScopeHammingDistance] = Json.format[AnnotationsSearchScopeHammingDistance]

  /** Snap a client-supplied scope onto one of the two searches we offer.
    *
    * The UI is a two-way radio, but the scope still arrives as plain JSON over a websocket, so the
    * server cannot assume the client sent one of the two. This used to clamp each field
    * independently against its own ceiling, which accepted a large space of in-between scopes — some
    * of them incoherent, such as a `total` below `substitutions`, which is not a stricter search but
    * one that silently degrades to the smaller budget and reads to the user as missing records.
    *
    * Anything asking for an indel becomes Levenshtein; everything else becomes Hamming. There is no
    * third outcome, so no combination of numbers can produce a scope nobody has reasoned about, and
    * the tree walk cost is bounded by construction rather than by a cap that has to be maintained.
    */
  def sanitize(distance: AnnotationsSearchScopeHammingDistance): AnnotationsSearchScopeHammingDistance =
    if (distance.insertions > 0 || distance.deletions > 0) Levenshtein else Hamming
}

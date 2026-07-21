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

  /** No edits at all. */
  final val Exact: AnnotationsSearchScopeHammingDistance =
    AnnotationsSearchScopeHammingDistance(substitutions = 0, insertions = 0, deletions = 0, total = 0)

  /** One substitution, no indels. */
  final val Hamming: AnnotationsSearchScopeHammingDistance =
    AnnotationsSearchScopeHammingDistance(substitutions = 1, insertions = 0, deletions = 0, total = 1)

  /** Two substitutions, no indels. */
  final val Hamming2: AnnotationsSearchScopeHammingDistance =
    AnnotationsSearchScopeHammingDistance(substitutions = 2, insertions = 0, deletions = 0, total = 2)

  /** One edit of any kind. `total = 1` is what makes it *one* edit rather than one of each. */
  final val Levenshtein: AnnotationsSearchScopeHammingDistance =
    AnnotationsSearchScopeHammingDistance(substitutions = 1, insertions = 1, deletions = 1, total = 1)

  /** The four searches the UI offers, in the order it offers them. */
  final val Offered: Seq[AnnotationsSearchScopeHammingDistance] = Seq(Exact, Hamming, Hamming2, Levenshtein)

  implicit val annotationsSearchScopeHammingDistanceFormat: Format[AnnotationsSearchScopeHammingDistance] = Json.format[AnnotationsSearchScopeHammingDistance]

  /** Snap a client-supplied scope onto one of the four searches we offer.
    *
    * The UI is a radio group, but the scope still arrives as plain JSON over a websocket, so the
    * server cannot assume the client sent one of the four. An earlier version clamped each field
    * independently against its own ceiling, which accepted a large space of in-between scopes — some
    * of them incoherent, such as a `total` below `substitutions`, which is not a stricter search but
    * one that silently degrades to the smaller budget and reads to the user as missing records.
    *
    * Total by construction: every input lands on a preset, so no combination of numbers can produce
    * a scope nobody has reasoned about.
    */
  def sanitize(distance: AnnotationsSearchScopeHammingDistance): AnnotationsSearchScopeHammingDistance =
    if (distance.insertions > 0 || distance.deletions > 0) {
      Levenshtein
    } else if (distance.substitutions <= 0 || distance.total <= 0) {
      Exact
    } else if (distance.substitutions == 1 || distance.total == 1) {
      Hamming
    } else {
      Hamming2
    }

  /** The index a scope is *searched against*, which is not the same thing as the scope itself.
    *
    * Only two indexes are ever built. Exact, Hamming and Hamming2 are all sub-ranges of a
    * two-substitution neighbourhood, so one index serves all three and the difference between them is
    * decided afterwards by counting the mutations the engine already reports on every hit. Levenshtein
    * needs its own: a substitution-only tree never walks indel neighbours, so those records are not
    * merely unfiltered there, they are unreachable.
    *
    * This is what bounds the index cache. It holds one entry per distinct value of *this* function —
    * two — rather than one per scope the client can name.
    */
  def indexScope(distance: AnnotationsSearchScopeHammingDistance): AnnotationsSearchScopeHammingDistance =
    if (sanitize(distance) == Levenshtein) Levenshtein else Hamming2
}

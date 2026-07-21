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

case class AnnotationsAnnotateScoring(`type`: Int, vdjmatch: AnnotationsVDJMatchScoringOptions)

object AnnotationsAnnotateScoring {
  implicit val annotationsAnnotateScoringFormat: Format[AnnotationsAnnotateScoring] = Json.format[AnnotationsAnnotateScoring]

  final val SIMPLE = 0
  final val VDJMATCH = 1

  /** Snap a client-supplied scoring type onto the only one the application offers.
    *
    * VDJMatch scoring is unreachable from the UI: `ScoringTypeComponent` and `ScoringVDJMatchComponent`
    * were declared in `annotations-filters.module.ts` but rendered by no template, and the filter model
    * hardcodes `type: SIMPLE`. The request still arrives as plain JSON over a websocket, though, so the
    * server cannot assume the client sent SIMPLE.
    *
    * Snapping it here is what lets the CDR3 search index be built once and shared: VDJMatch scoring is
    * the only thing that ever made the index depend on the request at all beyond its search scope —
    * `ScoringProvider.loadScoringBundle` takes the species and the gene, and the hit-filtering options
    * became a `ResultFilter` baked into the built database. With SIMPLE forced, every one of those
    * inputs is the DUMMY, for every request.
    */
  def sanitize(scoring: AnnotationsAnnotateScoring): AnnotationsAnnotateScoring =
    if (scoring.`type` == SIMPLE) scoring else scoring.copy(`type` = SIMPLE)
}

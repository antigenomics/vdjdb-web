package backend.server.annotations.api.filters

import play.api.libs.json.{Json, Format}

case class AnnotationsVDJMatchScoringHitFilteringOptions(probabilityThreshold: Int, hitType: String, topHitsCount: Int, weightByInfo: Boolean)

object AnnotationsVDJMatchScoringHitFilteringOptions {
    implicit val annotationsVDJMatchScoringHitFilteringOptionsFormat: Format[AnnotationsVDJMatchScoringHitFilteringOptions] =
        Json.format[AnnotationsVDJMatchScoringHitFilteringOptions]
}

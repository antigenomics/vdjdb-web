package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

case class AnnotationsVDJMatchScoringOptions(exhaustiveAlignment: Int, scoringMode: Int, hitFiltering: AnnotationsVDJMatchScoringHitFilteringOptions)

object AnnotationsVDJMatchScoringOptions {
    implicit val annotationsVDJMatchScoringOptionsFormat: Format[AnnotationsVDJMatchScoringOptions] = Json.format[AnnotationsVDJMatchScoringOptions]
}

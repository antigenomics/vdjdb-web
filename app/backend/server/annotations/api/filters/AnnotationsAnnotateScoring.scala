package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

case class AnnotationsAnnotateScoring(`type`: Int, vdjmatch: AnnotationsVDJMatchScoringOptions)

object AnnotationsAnnotateScoring {
    implicit val annotationsAnnotateScoringFormat: Format[AnnotationsAnnotateScoring] = Json.format[AnnotationsAnnotateScoring]

    final val SIMPLE = 0
    final val VDJMATCH = 1
}

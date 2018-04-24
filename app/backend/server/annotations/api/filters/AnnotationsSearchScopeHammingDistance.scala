package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

case class AnnotationsSearchScopeHammingDistance(substitutions: Int, insertions: Int, deletions: Int, total: Int)

object AnnotationsSearchScopeHammingDistance {
    implicit val annotationsSearchScopeHammingDistanceFormat: Format[AnnotationsSearchScopeHammingDistance] = Json.format[AnnotationsSearchScopeHammingDistance]
}

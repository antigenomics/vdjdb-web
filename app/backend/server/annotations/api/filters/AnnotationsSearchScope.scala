package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

case class AnnotationsSearchScope(matchV: Boolean, matchJ: Boolean, hammingDistance: AnnotationsSearchScopeHammingDistance)

object AnnotationsSearchScope {
    implicit val annotationsSearchScopeFormat: Format[AnnotationsSearchScope] = Json.format[AnnotationsSearchScope]
}

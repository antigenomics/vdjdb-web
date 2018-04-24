package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

case class AnnotationsDatabaseQueryParams(species: String, gene: String, mhc: String, confidenceThreshold: Int, minEpitopeSize: Int)

object AnnotationsDatabaseQueryParams {
    implicit val annotationsDatabaseQueryParamsFormat: Format[AnnotationsDatabaseQueryParams] = Json.format[AnnotationsDatabaseQueryParams]
}

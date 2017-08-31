package backend.server.filters

import backend.server.filters.FilterType.FilterType
import play.api.libs.json.Json

case class RequestFilter(column: String, filterType: FilterType, negative: Boolean, value: String)
object RequestFilter {
    implicit val filterReads = Json.reads[RequestFilter]
}
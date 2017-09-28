package backend.server.filters

import backend.server.filters.FilterType.FilterType
import play.api.libs.json.{Json, Reads}

case class RequestFilter(column: String, filterType: FilterType, negative: Boolean, value: String)
object RequestFilter {
    implicit val filterReads: Reads[RequestFilter] = Json.reads[RequestFilter]
}
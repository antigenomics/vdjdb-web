package backend.server.database.filters

import backend.server.database.filters.DatabaseFilterType.FilterType
import play.api.libs.json.{Json, Reads}

case class DatabaseFilterRequest(column: String, filterType: FilterType, negative: Boolean, value: String)
object DatabaseFilterRequest {
    implicit val filterReads: Reads[DatabaseFilterRequest] = Json.reads[DatabaseFilterRequest]
}
package backend.server.table.search.api.search

import backend.server.table.search.SearchTableRow
import play.api.libs.json.{Json, Writes}

case class SearchDataResponse(page: Int, pageSize: Int, pageCount: Int, recordsFound: Int, rows: List[SearchTableRow])

object SearchDataResponse {
    final val Action: String = "search"

    implicit val searchTableResultsFilterResponseWrites: Writes[SearchDataResponse] = Json.writes[SearchDataResponse]
}

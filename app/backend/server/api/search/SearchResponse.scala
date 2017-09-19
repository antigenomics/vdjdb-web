package backend.server.api.search

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import backend.server.table.search.SearchTableRow
import play.api.libs.json.{JsValue, Json, Writes}

case class SearchResponse(page: Int, pageSize: Int, pageCount: Int, recordsFound: Int, rows: List[SearchTableRow]) extends SuccessResponse(SearchResponse.action)

object SearchResponse {
    final val action: String = "search"

    implicit val searchTableResultsFilterResponseWrites: Writes[SearchResponse] =
        SuccessResponse.writesSubclass(Json.writes[SearchResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Invalid search request"))
}

package backend.server.api.search

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import backend.server.table.search_table.SearchTableRow
import play.api.libs.json.{JsValue, Json, Writes}

case class SearchTableResultsResponse(page: Int, pageSize: Int, count: Int, rows: List[SearchTableRow]) extends SuccessResponse(SearchTableResultsResponse.action)

object SearchTableResultsResponse {
    final val action: String = "search"

    implicit val searchTableResultsFilterResponseWrites: Writes[SearchTableResultsResponse] =
        SuccessResponse.writesSubclass(Json.writes[SearchTableResultsResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Invalid search request"))
}

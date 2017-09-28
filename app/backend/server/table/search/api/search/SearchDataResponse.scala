package backend.server.table.search.api.search

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import backend.server.table.search.SearchTableRow
import play.api.libs.json.{JsValue, Json, Writes}

case class SearchDataResponse(page: Int, pageSize: Int, pageCount: Int,
                              recordsFound: Int, rows: List[SearchTableRow]) extends SuccessResponse(SearchDataResponse.action)

object SearchDataResponse {
    final val action: String = "search"

    implicit val searchTableResultsFilterResponseWrites: Writes[SearchDataResponse] =
        SuccessResponse.writesSubclass(Json.writes[SearchDataResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Invalid search request"))
}

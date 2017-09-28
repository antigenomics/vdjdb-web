package backend.server.table.search.api.paired

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import backend.server.table.search.SearchTableRow
import play.api.libs.json.{JsValue, Json, Writes}

case class PairedDataResponse(paired: Option[SearchTableRow], found: Boolean) extends SuccessResponse(PairedDataResponse.action)

object PairedDataResponse {
    final val action: String = "paired"

    implicit val pairedDataResponseWrites: Writes[PairedDataResponse] = SuccessResponse.writesSubclass(Json.writes[PairedDataResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Paired row not found"))
}

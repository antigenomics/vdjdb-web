package backend.server.table.search.api.export

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import play.api.libs.json.{JsValue, Json, Writes}

case class ExportDataResponse(link: String) extends SuccessResponse(ExportDataResponse.action)

object ExportDataResponse {
    final val action: String = "export"

    implicit val exportDataResponseWrites: Writes[ExportDataResponse] = SuccessResponse.writesSubclass(Json.writes[ExportDataResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Invalid export request"))
}
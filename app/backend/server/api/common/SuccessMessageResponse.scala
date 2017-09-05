package backend.server.api.common

import backend.server.api.SuccessResponse
import play.api.libs.json.{Json, Writes}

case class SuccessMessageResponse(message: String) extends SuccessResponse("message")

object SuccessMessageResponse {
    implicit val successMessageResponseWrites: Writes[SuccessMessageResponse] = SuccessResponse.writesSubclass(Json.writes[SuccessMessageResponse])
}

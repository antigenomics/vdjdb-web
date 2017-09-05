package backend.server.api.common

import backend.server.api.ErrorResponse
import play.api.libs.json.{JsValue, Json, Writes}

case class ErrorMessageResponse(message: String) extends ErrorResponse("message")

object ErrorMessageResponse {
    implicit val errorMessageResponseWrites: Writes[ErrorMessageResponse] = ErrorResponse.writesSubclass(Json.writes[ErrorMessageResponse])
}

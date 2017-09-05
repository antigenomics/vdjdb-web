package backend.server.api.common

import backend.server.api.WarningResponse
import play.api.libs.json.{Json, Writes}

case class WarningMessageResponse(message: String) extends WarningResponse("message")

object WarningMessageResponse {
    implicit val warningMessageResponseWrites: Writes[WarningMessageResponse] = WarningResponse.writesSubclass(Json.writes[WarningMessageResponse])
}

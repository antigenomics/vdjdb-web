package backend.server.messages

import play.api.libs.json.{JsValue, Json, Writes}

case class WarningMessage(action: String, data: JsValue)

object WarningMessage {
    implicit val errorMessageWrites = new Writes[WarningMessage] {
        def writes(message: WarningMessage) = Json.obj(
            "status" -> "warning",
            "action" -> message.action,
            "data" -> message.data
        )
    }
}
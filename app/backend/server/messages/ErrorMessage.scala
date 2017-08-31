package backend.server.messages

import play.api.libs.json.{JsValue, Json, Writes}

case class ErrorMessage(action: String, data: JsValue)

object ErrorMessage {
    implicit val errorMessageWrites = new Writes[ErrorMessage] {
        def writes(message: ErrorMessage) = Json.obj(
            "status" -> "error",
            "action" -> message.action,
            "data" -> message.data
        )
    }
}
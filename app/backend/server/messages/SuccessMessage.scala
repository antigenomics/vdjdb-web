package backend.server.messages

import play.api.libs.json.{JsValue, Json, Writes}

case class SuccessMessage(action: String, data: JsValue)

object SuccessMessage {
    implicit val successMessageWrites = new Writes[SuccessMessage] {
        def writes(message: SuccessMessage) = Json.obj(
            "status" -> "success",
            "action" -> message.action,
            "data" -> message.data
        )
    }
}
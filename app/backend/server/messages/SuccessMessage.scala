package backend.server.messages

import play.api.libs.json.{JsObject, Json, Writes}

class SuccessMessage(val action: String)

object SuccessMessage {
    def writes[T](writer: Writes[T]): Writes[T] = (t: T) => Json.obj(
        "status" -> "success",
        "action" -> t.asInstanceOf[SuccessMessage].action
    ) ++ writer.writes(t).as[JsObject]
}
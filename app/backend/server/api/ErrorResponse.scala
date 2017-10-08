package backend.server.api

import play.api.libs.json.{JsObject, JsValue, Json, Writes}

class ErrorResponse(val action: String)

object ErrorResponse {
    def createSimpleResponse(action: String) : JsValue = {
        Json.toJson(Json.obj(
            "status" -> "error",
            "action" -> action
        ))
    }

    def writesSubclass[T](writer: Writes[T]): Writes[T] = (t: T) => Json.obj(
        "status" -> "error",
        "action" -> t.asInstanceOf[ErrorResponse].action
    ) ++ writer.writes(t).as[JsObject]
}

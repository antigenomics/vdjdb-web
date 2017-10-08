package backend.server.api

import play.api.libs.json.{JsObject, JsValue, Json, Writes}

class SuccessResponse(val action: String)

object SuccessResponse {
    def createSimpleResponse(action: String) : JsValue = {
        Json.toJson(Json.obj(
            "status" -> "success",
            "action" -> action
        ))
    }

    def writesSubclass[T](writer: Writes[T]): Writes[T] = (t: T) => Json.obj(
        "status" -> "success",
        "action" -> t.asInstanceOf[SuccessResponse].action
    ) ++ writer.writes(t).as[JsObject]
}

package backend.server.api

import play.api.libs.json.{JsObject, Json, Writes}

class SuccessResponse(val action: String)

object SuccessResponse {
    def writesSubclass[T](writer: Writes[T]): Writes[T] = (t: T) => Json.obj(
        "status" -> "success",
        "action" -> t.asInstanceOf[SuccessResponse].action
    ) ++ writer.writes(t).as[JsObject]
}

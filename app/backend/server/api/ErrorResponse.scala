package backend.server.api

import play.api.libs.json.{JsObject, Json, Writes}

class ErrorResponse(val action: String)

object ErrorResponse {
    def writesSubclass[T](writer: Writes[T]): Writes[T] = (t: T) => Json.obj(
        "status" -> "error",
        "action" -> t.asInstanceOf[SuccessResponse].action
    ) ++ writer.writes(t).as[JsObject]
}

package backend.server.api

import play.api.libs.json.{JsObject, Json, Writes}

class WarningResponse(val action: String)

object WarningResponse {
    def writesSubclass[T](writer: Writes[T]): Writes[T] = (t: T) => Json.obj(
        "status" -> "warning",
        "action" -> t.asInstanceOf[WarningResponse].action
    ) ++ writer.writes(t).as[JsObject]
}
package backend.server.api

import play.api.libs.json.{JsSuccess, JsValue, Reads}

case class ClientRequest(action: Option[String], data: Option[JsValue])

object ClientRequest {
    implicit val clientRequestReads: Reads[ClientRequest] = (json: JsValue) =>
        JsSuccess(ClientRequest((json \ "action").asOpt[String], (json \ "data").asOpt[JsValue]))
}

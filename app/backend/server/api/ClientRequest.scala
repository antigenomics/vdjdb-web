package backend.server.api

import play.api.libs.json.{JsError, JsSuccess, JsValue, Reads}

case class ClientRequest(id: Int, action: Option[String], data: Option[JsValue])

object ClientRequest {
    implicit val clientRequestReads: Reads[ClientRequest] = (json: JsValue) => {
        if ((json \ "id").isEmpty) {
            JsError()
        } else {
            JsSuccess(ClientRequest((json \ "id").as[Int], (json \ "action").asOpt[String], (json \ "data").asOpt[JsValue]))
        }
    }
}

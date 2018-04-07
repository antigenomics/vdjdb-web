package backend.actors

import akka.actor.{Actor, ActorRef, ActorSystem, PoisonPill}
import backend.server.api.ClientRequest
import backend.server.limit.{IpLimit, RequestLimits}
import play.api.libs.json._

abstract class WebSocketActor(out: ActorRef, limit: IpLimit)(implicit as: ActorSystem, limits: RequestLimits) extends Actor {

    protected def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit

    override def receive: Receive = {
        case request: JsValue =>
            if (limits.allowConnection(limit)) {
                val timeStart: Long = System.currentTimeMillis
                val validation: JsResult[ClientRequest] = request.validate[ClientRequest]
                validation match {
                    case clientRequest: JsSuccess[ClientRequest] =>
                        val request = clientRequest.get
                        request.action match {
                            case Some(action) =>
                                val webSocketOutActorRef = WebSocketOutActorRef(request.id, action, out)
                                action match {
                                    case WebSocketOutActorRef.PingAction => webSocketOutActorRef.handshake()
                                    case _ => handleMessage(webSocketOutActorRef, request.data)
                                }
                            case None =>
                        }
                    case _: JsError =>
                        out ! Json.toJson(WebSocketOutActorRef.InvalidRequestMessage)
                }
                val timeEnd: Long = System.currentTimeMillis
                val timeSpent = timeEnd - timeStart
                limits.updateLimits(limit, 1, timeSpent)
            } else {
                out ! PoisonPill
            }
        case _ =>
            out ! PoisonPill
    }

    def validateData[T](out: WebSocketOutActorRef, data: Option[JsValue], callback: T => Unit)(implicit tr: Reads[T]): Unit = {
        if (data.nonEmpty) {
            val dataValidation: JsResult[T] = data.get.validate[T]
            dataValidation match {
                case success: JsSuccess[T] =>
                    callback(success.get)
                case _: JsError =>
                    out.errorMessage("Invalid request (data)")
            }
        } else {
            out.errorMessage("Empty data field")
        }
    }
}

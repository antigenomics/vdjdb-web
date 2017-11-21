package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.server.limit.{IpLimit, RequestLimits}
import play.api.libs.json._

import scala.concurrent.ExecutionContext

class AnnotationsWebSocketActor(out: ActorRef, limit: IpLimit)
                               (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits)
    extends WebSocketActor(out, limit) {

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case _ =>
                out.errorMessage("Invalid action")
        }
    }

}

object AnnotationsWebSocketActor {
    def props(out: ActorRef, limit: IpLimit)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits): Props =
        Props(new AnnotationsWebSocketActor(out, limit))
}

package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.User
import backend.server.annotations.api.user.UserDetailsResponse
import backend.server.limit.{IpLimit, RequestLimits}
import play.api.libs.json._

import scala.async.Async.{async, await}
import scala.concurrent.ExecutionContext

class AnnotationsWebSocketActor(out: ActorRef, limit: IpLimit, user: User)
                               (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, upp: UserPermissionsProvider)
    extends WebSocketActor(out, limit) {

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case UserDetailsResponse.Action => async {
                out.success(UserDetailsResponse(await(user.getDetails)))
            }
            case _ =>
                out.errorMessage("Invalid action")
        }
    }

}

object AnnotationsWebSocketActor {
    def props(out: ActorRef, limit: IpLimit, user: User)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, upp: UserPermissionsProvider): Props =
        Props(new AnnotationsWebSocketActor(out, limit, user))
}

/*
 *     Copyright 2017-2018 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.server.limit.{IpLimit, RequestLimits}
import backend.server.motifs.Motifs
import play.api.libs.json.JsValue

import scala.concurrent.ExecutionContext

class MotifsSearchWebSocketActor(out: ActorRef, limit: IpLimit, motifs: Motifs)
                                (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits)
    extends WebSocketActor(out, limit) {

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case _ =>
                out.errorMessage(MotifsSearchWebSocketActor.invalidActionMessage)
        }
    }

}

object MotifsSearchWebSocketActor {
    final val invalidActionMessage: String = "Invalid action"

    def props(out: ActorRef, limit: IpLimit, motifs: Motifs)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits): Props =
        Props(new MotifsSearchWebSocketActor(out, limit, motifs))
}

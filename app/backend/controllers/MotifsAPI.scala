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

package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.actors.MotifsSearchWebSocketActor
import backend.server.limit.RequestLimits
import backend.server.motifs.Motifs
import javax.inject._
import play.api.Configuration
import play.api.libs.json.JsValue
import play.api.libs.streams.ActorFlow
import play.api.mvc.{AbstractController, ControllerComponents, WebSocket}

import scala.concurrent.{ExecutionContext, Future}

class MotifsAPI @Inject()(cc: ControllerComponents, motifs: Motifs, configuration: Configuration)
                         (implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits)
    extends AbstractController(cc) {

    def connect: WebSocket = WebSocket.acceptOrResult[JsValue, JsValue] { implicit request =>
        Future.successful(if (limits.allowConnection(request)) {
            Right(ActorFlow.actorRef { out =>
                MotifsSearchWebSocketActor.props(out, limits.getLimit(request), motifs)
            })
        } else {
            Left(Forbidden)
        })
    }

}

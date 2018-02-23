/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.{User, UserDetails}
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.SampleFileProvider
import backend.server.database.Database
import backend.server.limit.{IpLimit, RequestLimits}
import play.api.libs.json.JsValue

import scala.concurrent.ExecutionContext

class MultisampleAnalysisWebSocketActor(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
                                       (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
                                        upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider)
    extends WebSocketActor(out, limit) {

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case _ =>
                out.errorMessage("Invalid action")
        }
    }
}

object MultisampleAnalysisWebSocketActor {
    def props(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
              upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider): Props =
        Props(new MultisampleAnalysisWebSocketActor(out, limit, user, details, database))
}
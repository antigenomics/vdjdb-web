/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.utils.files

import akka.actor.ActorSystem
import play.api.libs.json.{Json, Reads, Writes}

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

case class TemporaryFileLink(unique: String, guard: String, hash: String) {
    def getDownloadLink: String = "/temporary/" + unique + "/" + guard + "/" + hash

    def autoremove(actorSystem: ActorSystem)(implicit ec: ExecutionContext, temporaryConfiguration: TemporaryConfiguration): Unit = {
        actorSystem.scheduler.scheduleOnce(delay = 600.seconds) {
            val temporary = TemporaryFile.find(this, lock = false)
            temporary match {
                case Some(temporaryFile) =>
                    if (!temporaryFile.isLocked) {
                        temporaryFile.delete()
                    }
                case None =>
            }
        }
    }
}

object TemporaryFileLink {
    implicit val temporaryFileLinkWrites: Writes[TemporaryFileLink] = Json.writes[TemporaryFileLink]
    implicit val temporaryFileLinkReads: Reads[TemporaryFileLink] = Json.reads[TemporaryFileLink]
}

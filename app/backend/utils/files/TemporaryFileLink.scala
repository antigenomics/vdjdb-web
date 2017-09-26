package backend.utils.files

import akka.actor.ActorSystem
import play.api.libs.json.{Json, Reads, Writes}

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

case class TemporaryFileLink(unique: String, guard: String, hash: String) {
    def getDownloadLink: String = "/temporary/" + unique + "/" + guard + "/" + hash

    def autoremove(actorSystem: ActorSystem)(implicit ec: ExecutionContext): Unit = {
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

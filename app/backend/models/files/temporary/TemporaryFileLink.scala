package backend.models.files.temporary

import play.api.libs.json.{Json, Reads, Writes}

case class TemporaryFileLink(link: String)

object TemporaryFileLink {
    implicit val temporaryFileLinkWrites: Writes[TemporaryFileLink] = Json.writes[TemporaryFileLink]
    implicit val temporaryFileLinkReads: Reads[TemporaryFileLink] = Json.reads[TemporaryFileLink]
}

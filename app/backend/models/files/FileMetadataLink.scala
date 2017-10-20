package backend.models.files

import play.api.libs.json.{Json, Reads, Writes}

case class FileMetadataLink(guard: String, hash: String) {
    def getDownloadLink: String = "/download/file/metadata/" + guard + "/" + hash
}

object FileMetadataLink {
    implicit val temporaryFileLinkWrites: Writes[FileMetadataLink] = Json.writes[FileMetadataLink]
    implicit val temporaryFileLinkReads: Reads[FileMetadataLink] = Json.reads[FileMetadataLink]
}

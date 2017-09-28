package backend.server.table.search.api.paired

import play.api.libs.json.{Json, Reads}

case class PairedDataRequest(pairedID: String, gene: String)

object PairedDataRequest {
    implicit val pairedDataRequestReads: Reads[PairedDataRequest] = Json.reads[PairedDataRequest]
}

package backend.server.table.search.api.export

import play.api.libs.json.{Json, Reads}

case class ExportDataRequest(format: String)

object ExportDataRequest {
    implicit val exportDataRequestReads: Reads[ExportDataRequest] = Json.reads[ExportDataRequest]
}

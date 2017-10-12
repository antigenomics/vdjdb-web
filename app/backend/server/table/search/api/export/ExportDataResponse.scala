package backend.server.table.search.api.export

import play.api.libs.json.{Json, Writes}

case class ExportDataResponse(link: String)

object ExportDataResponse {
    final val Action: String = "export"

    implicit val exportDataResponseWrites: Writes[ExportDataResponse] = Json.writes[ExportDataResponse]
}
package backend.server.table.search.api.paired

import backend.server.table.search.SearchTableRow
import play.api.libs.json.{Json, Writes}

case class PairedDataResponse(paired: Option[SearchTableRow], found: Boolean)

object PairedDataResponse {
    final val Action: String = "paired"

    implicit val pairedDataResponseWrites: Writes[PairedDataResponse] = Json.writes[PairedDataResponse]
}

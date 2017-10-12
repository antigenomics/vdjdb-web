package backend.server.database.api.metadata

import backend.server.database.DatabaseColumnInfo
import play.api.libs.json.{Json, Writes}

case class DatabaseColumnInfoResponse(column: DatabaseColumnInfo)

object DatabaseColumnInfoResponse {
    final val Action: String = "columnInfo"

    implicit val databaseMetadataColumnInfoResponseWrites: Writes[DatabaseColumnInfoResponse] = Json.writes[DatabaseColumnInfoResponse]
}

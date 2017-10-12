package backend.server.database.api.metadata

import backend.server.database.DatabaseMetadata
import play.api.libs.json.{Json, Writes}

case class DatabaseMetadataResponse(metadata: DatabaseMetadata)

object DatabaseMetadataResponse {
    final val Action: String = "meta"

    implicit val databaseMetadataResponseFormat: Writes[DatabaseMetadataResponse] = Json.writes[DatabaseMetadataResponse]
}

package backend.server.api.database

import backend.server.api.SuccessResponse
import backend.server.database.DatabaseMetadata
import play.api.libs.json.{Json, Writes}

case class DatabaseMetadataResponse(metadata: DatabaseMetadata) extends SuccessResponse(DatabaseMetadataResponse.action)

object DatabaseMetadataResponse {
    final val action: String = "meta"

    implicit val databaseMetadataResponseFormat: Writes[DatabaseMetadataResponse] = SuccessResponse.writesSubclass(Json.writes[DatabaseMetadataResponse])
}

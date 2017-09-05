package backend.server.api.database

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import backend.server.database.DatabaseColumnInfo
import play.api.libs.json.Json.toJson
import play.api.libs.json.{JsValue, Json, Writes}

case class DatabaseColumnInfoResponse(column: DatabaseColumnInfo) extends SuccessResponse(DatabaseColumnInfoResponse.action)

object DatabaseColumnInfoResponse {
    final val action: String = "columnInfo"

    implicit val databaseMetadataColumnInfoResponseWrites: Writes[DatabaseColumnInfoResponse] = SuccessResponse.writesSubclass(Json.writes[DatabaseColumnInfoResponse])

    def errorMessage: JsValue = toJson(ErrorMessageResponse("Invalid column name"))
}

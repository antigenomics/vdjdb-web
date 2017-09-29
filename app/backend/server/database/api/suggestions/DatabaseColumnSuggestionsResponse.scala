package backend.server.database.api.suggestions

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import play.api.libs.json.{JsValue, Json, Writes}

case class DatabaseColumnSuggestionResponse(suggestions: Map[String, List[DatabaseColumnSuggestions]])
    extends SuccessResponse(DatabaseColumnSuggestionResponse.action)

object DatabaseColumnSuggestionResponse {
    final val action: String = "suggestions"

    implicit val databaseColumnSuggestionRequestWrites: Writes[DatabaseColumnSuggestionResponse] =
        SuccessResponse.writesSubclass(Json.writes[DatabaseColumnSuggestionResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Invalid suggestions request"))
}

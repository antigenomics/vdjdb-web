package backend.server.database.api.suggestions

import backend.server.api.SuccessResponse
import backend.server.api.common.ErrorMessageResponse
import play.api.libs.json.{JsValue, Json, Writes}

case class DatabaseColumnSuggestionsResponse(suggestions: Map[String, List[DatabaseColumnSuggestion]])
    extends SuccessResponse(DatabaseColumnSuggestionsResponse.action)

object DatabaseColumnSuggestionsResponse {
    final val action: String = "suggestions"

    implicit val databaseColumnSuggestionsRequestWrites: Writes[DatabaseColumnSuggestionsResponse] =
        SuccessResponse.writesSubclass(Json.writes[DatabaseColumnSuggestionsResponse])

    def errorMessage: JsValue = Json.toJson(ErrorMessageResponse("Invalid suggestions request"))
}

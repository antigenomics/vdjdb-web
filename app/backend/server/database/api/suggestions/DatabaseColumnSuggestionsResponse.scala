package backend.server.database.api.suggestions

import play.api.libs.json.{Json, Writes}

case class DatabaseColumnSuggestionsResponse(suggestions: Map[String, List[DatabaseColumnSuggestion]])

object DatabaseColumnSuggestionsResponse {
    final val Action: String = "suggestions"

    implicit val databaseColumnSuggestionsRequestWrites: Writes[DatabaseColumnSuggestionsResponse] = Json.writes[DatabaseColumnSuggestionsResponse]
}

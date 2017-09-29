package backend.server.database.api.suggestions

import play.api.libs.json.{Json, Reads}

case class DatabaseColumnSuggestionsRequest(column: String)

object DatabaseColumnSuggestionsRequest {
    implicit val databaseColumnSuggestionRequestReads: Reads[DatabaseColumnSuggestionsRequest] = Json.reads[DatabaseColumnSuggestionsRequest]
}

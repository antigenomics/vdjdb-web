package backend.server.database.api.suggestions

import play.api.libs.json.{Json, Writes}

case class DatabaseColumnSuggestions(value: String, meta: String)

object DatabaseColumnSuggestions {
    implicit val databaseColumnSuggestionsWrites: Writes[DatabaseColumnSuggestions] = Json.writes[DatabaseColumnSuggestions]
}

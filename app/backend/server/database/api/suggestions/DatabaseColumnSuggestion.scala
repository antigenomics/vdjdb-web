package backend.server.database.api.suggestions

import com.antigenomics.vdjdb.web.EpitopeSuggestion
import play.api.libs.json.{Json, Writes}

case class DatabaseColumnSuggestion(value: String, meta: String)

object DatabaseColumnSuggestion {
    implicit val databaseColumnSuggestionsWrites: Writes[DatabaseColumnSuggestion] = Json.writes[DatabaseColumnSuggestion]

    def createFromEpitopeSuggestion(epitopeSuggestion: EpitopeSuggestion): DatabaseColumnSuggestion = {
        val meta = s"Substitutions: ${epitopeSuggestion.substitutions}, Indels: ${epitopeSuggestion.indels}, " +
            s"Length: ${epitopeSuggestion.length}, Count: ${epitopeSuggestion.count}"
        DatabaseColumnSuggestion(epitopeSuggestion.sequence, meta)
    }
}

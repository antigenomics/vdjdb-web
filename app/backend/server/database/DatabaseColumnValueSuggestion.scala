package backend.server.database

import com.antigenomics.vdjdb.web.EpitopeSuggestion
import play.api.libs.json.Json

case class DatabaseColumnValueSuggestion(value: String, meta: String) {
    def this(es: EpitopeSuggestion) {
        this(es.sequence, es.substitutions.toString + ":" + es.indels.toString + ":" + es.length.toString + ":" + es.count.toString)
    }
}

object DatabaseColumnValueSuggestion {
    implicit val databaseColumnValueSuggestionWrites = Json.writes[DatabaseColumnValueSuggestion]
}

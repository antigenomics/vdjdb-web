package backend.server.table.search_table

import play.api.libs.json.Json

case class SearchTableEntry(column: String, value: String)

object SearchTableEntry {
    implicit val searchTableEntryWrites = Json.writes[SearchTableEntry]
}

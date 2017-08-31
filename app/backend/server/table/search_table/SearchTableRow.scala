package backend.server.table.search_table

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.Json

case class SearchTableRow(entries: Array[SearchTableEntry])

object SearchTableRow {
    implicit val searchTableRowWrites = Json.writes[SearchTableRow]

    def createFromRow(r: Row): SearchTableRow = {
        SearchTableRow(r.getEntries.map(e => SearchTableEntry(e.getColumn.getName, e.getValue)))
    }
}

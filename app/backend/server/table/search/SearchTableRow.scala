package backend.server.table.search

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.{Json, OWrites}

case class SearchTableRow(entries: Array[SearchTableEntry], metadata: SearchTableRowMetadata)

object SearchTableRow {
    implicit val searchTableRowWrites: OWrites[SearchTableRow] = Json.writes[SearchTableRow]

    def createFromRow(r: Row): SearchTableRow = {
        val entries = r.getEntries
            .filter(e => e.getColumn.getMetadata.get("visible") == "1")
            .map(e => SearchTableEntry(e.getColumn.getName, e.getValue))
        val metadata = SearchTableRowMetadata.createFromRow(r)
        SearchTableRow(entries, metadata)
    }
}

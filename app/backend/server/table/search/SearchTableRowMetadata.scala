package backend.server.table.search

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.{Json, OWrites}

case class SearchTableRowMetadata(complex: String)

object SearchTableRowMetadata {
    implicit val searchTableRowMetadataWrites: OWrites[SearchTableRowMetadata] = Json.writes[SearchTableRowMetadata]

    def createFromRow(r: Row) : SearchTableRowMetadata = {
        SearchTableRowMetadata(r.getAt("complex.id").getValue)
    }
}

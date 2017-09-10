package backend.server.table.search

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.{Json, OWrites}

case class SearchTableRowMetadata(complex: String, cdr3vEnd: Int, cdr3jStart: Int)

object SearchTableRowMetadata {
    implicit val searchTableRowMetadataWrites: OWrites[SearchTableRowMetadata] = Json.writes[SearchTableRowMetadata]

    def createFromRow(r: Row) : SearchTableRowMetadata = {
        val cdr3fix = Json.parse(r.getAt("cdr3fix").getValue)

        val cdr3vEnd = (cdr3fix \ "vEnd").validate[Int].asOpt.getOrElse(-1)
        val cdr3jStart = (cdr3fix \ "jStart").validate[Int].asOpt.getOrElse(-1)

        SearchTableRowMetadata(r.getAt("complex.id").getValue, cdr3vEnd, cdr3jStart)
    }
}

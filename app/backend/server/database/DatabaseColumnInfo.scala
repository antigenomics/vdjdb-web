package backend.server.database

import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.Json

import scala.collection.JavaConverters._

case class DatabaseColumnInfo(name: String, columnType: String, visible: Boolean, dataType: String, title: String, comment: String, values: List[String])

object DatabaseColumnInfo {
    implicit val columnWrapperWrites = Json.writes[DatabaseColumnInfo]

    def createInfoFromColumn(column: Column): DatabaseColumnInfo = {
        val name: String = column.getName
        val meta = column.getMetadata
        val columnType: String = meta.get("type")
        val visible: Boolean = meta.get("visible") == "1"
        val dataType: String = meta.get("data.type")
        val title: String = meta.get("title")
        val comment: String = meta.get("comment")
        val values: List[String] = if (meta.get("autocomplete") == "1") column.getValues.asScala.toList else List[String]()
        DatabaseColumnInfo(name, columnType, visible, dataType, title, comment, values)
    }
}

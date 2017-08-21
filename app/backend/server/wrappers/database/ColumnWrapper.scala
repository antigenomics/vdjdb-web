package backend.server.wrappers.database

import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.Json

import scala.collection.mutable.ListBuffer

case class ColumnWrapper(name: String, `type`: String,
                         visible: Boolean, searchable: Boolean,
                         dataType: String, title: String,
                         comment: String, autocomplete: Boolean,
                         values: List[String])

object ColumnWrapper {
    implicit val columnWrapperWrites = Json.writes[ColumnWrapper]

    def wrap(column: Column): ColumnWrapper = {
        val name: String = column.getName
        val meta = column.getMetadata
        val `type`: String = meta.get("type")
        val visible: Boolean = meta.get("visible") == "1"
        val searchable: Boolean = meta.get("searchable") == "1"
        val dataType: String = meta.get("data.type")
        val title: String = meta.get("title")
        val comment: String = meta.get("comment")
        val autocomplete: Boolean = meta.get("autocomplete") == "1"
        val values: ListBuffer[String] = ListBuffer[String]()

        if (autocomplete) {
            column.getValues.forEach((value: String) => {
                values += value
            })
        }

        ColumnWrapper(name, `type`, visible, searchable, dataType, title, comment, autocomplete, values.toList)
    }
}

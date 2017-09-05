package backend.server.database

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.{JsValue, Json, OWrites}

import scala.collection.JavaConverters._

case class DatabaseMetadata(numberOfRecords: Int, numberOfColumns: Int, columns: List[DatabaseColumnInfo]) {
    require(numberOfRecords > 0, "number of records should be greater than zero")
    require(numberOfColumns > 0, "number of columns should be greater than zero")
}

object DatabaseMetadata {
    implicit val databaseMetadataWrites: OWrites[DatabaseMetadata] = Json.writes[DatabaseMetadata]

    implicit def databaseMetadataToJsValue(databaseMetadata: DatabaseMetadata): JsValue = Json.toJson(databaseMetadata)

    def createFromInstance(instance: VdjdbInstance): DatabaseMetadata = {
        val dbInstance = instance.getDbInstance
        val numberOfRecords = dbInstance.getRows.size()
        val numberOfColumns = dbInstance.getColumns.size()
        val columns = dbInstance.getColumns.asScala.map((c: Column) => DatabaseColumnInfo.createInfoFromColumn(c)).toList
        DatabaseMetadata(numberOfRecords, numberOfColumns, columns)
    }
}
package backend.server.database

import backend.server.wrappers.database.ColumnWrapper
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Column

import scala.collection.mutable.ListBuffer

case class DatabaseMetadata(columns: List[ColumnWrapper]) {}

object DatabaseMetadata {
    def generate(instance: VdjdbInstance) : DatabaseMetadata = {
        var columnsBuffer: ListBuffer[ColumnWrapper] = ListBuffer[ColumnWrapper]()
        instance.getDbInstance.getColumns.forEach((c: Column) => {
            columnsBuffer += ColumnWrapper.wrap(c)
        })
        DatabaseMetadata(columnsBuffer.toList)
    }

}

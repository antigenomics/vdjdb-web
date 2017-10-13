/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.server.database

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.{Json, OWrites}

import scala.collection.JavaConverters._

case class DatabaseMetadata(numberOfRecords: Int, numberOfColumns: Int, columns: List[DatabaseColumnInfo]) {
    require(numberOfRecords > 0, "number of records should be greater than zero")
    require(numberOfColumns > 0, "number of columns should be greater than zero")
}

object DatabaseMetadata {
    implicit val databaseMetadataWrites: OWrites[DatabaseMetadata] = Json.writes[DatabaseMetadata]

    def createFromInstance(instance: VdjdbInstance): DatabaseMetadata = {
        val dbInstance = instance.getDbInstance
        val numberOfRecords = dbInstance.getRows.size()
        val numberOfColumns = dbInstance.getColumns.size()
        val columns = dbInstance.getColumns
            .asScala
            .map((c: Column) => DatabaseColumnInfo.createInfoFromColumn(c))
            .filter((info: DatabaseColumnInfo) => info.visible)
            .toList
        DatabaseMetadata(numberOfRecords, numberOfColumns, columns)
    }
}
/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.server.database

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.{Format, Json}

import scala.collection.JavaConverters._

case class DatabaseMetadata(numberOfRecords: Int, numberOfColumns: Int, columns: List[DatabaseColumnInfo]) {
  require(numberOfRecords > 0, DatabaseMetadata.numberOfRecordsRequirementErrorMessage)
  require(numberOfColumns > 0, DatabaseMetadata.numberOfColumnsRequirementErrorMessage)

  def getColumnIndex(columnName: String): Int = {
    columns.indexWhere(_.name == columnName)
  }
}

object DatabaseMetadata {
  final val numberOfRecordsRequirementErrorMessage: String = "number of records should be greater than zero"
  final val numberOfColumnsRequirementErrorMessage: String = "number of columns should be greater than zero"

  // Columns kept invisible in the table UI but still sent to the frontend so that
  // the Evidence badges can read them. The frontend hides them in normalizeMetadata.
  final val EvidenceColumns: Seq[String] = Seq(
    "evidence.validation.same.study",
    "evidence.validation.independent",
    "evidence.structure.native",
    "evidence.structure.contacts",
    "evidence.structure.quality"
  )

  // Columns forced through to the frontend regardless of their meta "visible" flag.
  final val ForcedColumns: Set[String] = EvidenceColumns.toSet + "TCR_hash"

  implicit val databaseMetadataFormat: Format[DatabaseMetadata] = Json.format[DatabaseMetadata]

  def createFromInstance(instance: VdjdbInstance): DatabaseMetadata = {
    val dbInstance = instance.getDbInstance
    val numberOfRecords = dbInstance.getRows.size()
    val rawColumns = dbInstance.getColumns
      .asScala
      .map((c: Column) => DatabaseColumnInfo.createInfoFromColumn(c))
      .map((info: DatabaseColumnInfo) =>
        if (ForcedColumns.contains(info.name)) info.copy(visible = true) else info
      )

    val columns = rawColumns
      .filter((info: DatabaseColumnInfo) => info.visible)
      .toList
    DatabaseMetadata(numberOfRecords, columns.size, columns)
  }
}

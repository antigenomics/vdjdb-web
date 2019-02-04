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

import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.{Format, Json}

import scala.collection.JavaConverters._

case class DatabaseColumnInfo(name: String, columnType: String, visible: Boolean, dataType: String, title: String, comment: String, values: List[String])

object DatabaseColumnInfo {
  implicit val columnWrapperFormat: Format[DatabaseColumnInfo] = Json.format[DatabaseColumnInfo]

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

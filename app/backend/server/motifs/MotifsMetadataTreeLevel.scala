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

package backend.server.motifs


import backend.utils.CommonUtils
import play.api.libs.json.{Format, Json}
import tech.tablesaw.api.Table

import scala.collection.JavaConverters._

case class MotifsMetadataTreeLevel(name: String, values: Seq[MotifsMetadataTreeLevelValue])

object MotifsMetadataTreeLevel {
  implicit val motifsMetadataTreeLevelFormat: Format[MotifsMetadataTreeLevel] = Json.format[MotifsMetadataTreeLevel]

  def createTreeLevelFromTable(table: Table, name: String, next: Seq[String], chain: String): MotifsMetadataTreeLevel = {
    val values = table.stringColumn(name).asSet().asScala.toSeq.filter(_.nonEmpty).map { value =>
      val st = table.where(table.stringColumn(name).isEqualTo(value))
      val nextChain = s"$chain$value"
      MotifsMetadataTreeLevelValue(
        value,
        if (next.headOption.isEmpty) Some(CommonUtils.md5(nextChain)) else None,
        next.headOption.map(n => MotifsMetadataTreeLevel.createTreeLevelFromTable(st, n, next.tail, nextChain))
      )
    }
    MotifsMetadataTreeLevel(name, values)
  }
}

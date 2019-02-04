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

package backend.server.motifs.api.epitope

import play.api.libs.json.{Format, Json}
import tech.tablesaw.api.Table

import scala.collection.JavaConverters._

case class MotifClusterEntry(position: Int, aa: Seq[MotifClusterEntryAA])

object MotifClusterEntry {
  implicit val motifClusterEntryFormat: Format[MotifClusterEntry] = Json.format[MotifClusterEntry]

  def fromTable(table: Table): MotifClusterEntry = {
    val pos = table.intColumn("pos").asList.asScala.toSet

    assert(pos.size == 1)

    val position = pos.head
    val aa = scala.collection.mutable.ListBuffer.empty[MotifClusterEntryAA]

    table.doWithRows { row =>
      aa += MotifClusterEntryAA(
        row.getString("aa"),
        row.getInt("len"),
        row.getInt("count"),
        row.getDouble("freq"),
        row.getDouble("I"),
        row.getDouble("I.norm"),
        row.getDouble("height.I"),
        row.getDouble("height.I.norm")
      )
    }

    MotifClusterEntry(position, aa.toSeq)
  }
}

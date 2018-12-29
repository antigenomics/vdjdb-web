/*
 *     Copyright 2017-2018 Bagaev Dmitry
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

case class MotifCluster(clusterId: String, size: Int, entries: Seq[MotifClusterEntry])

object MotifCluster {
  implicit val motifClusterFormat: Format[MotifCluster] = Json.format[MotifCluster]

  def fromTable(table: Table): MotifCluster = {
    val cid = table.stringColumn("cid").asSet.asScala
    val csz = table.intColumn("csz").asList.asScala.toSet

    assert(cid.size == 1 && csz.size == 1)

    val clusterId = cid.head
    val size = csz.head
    val entries = table.splitOn(table.intColumn("pos")).asTableList().asScala.map(MotifClusterEntry.fromTable)

    MotifCluster(clusterId, size, entries)
  }
}

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

case class MotifCluster(clusterId: String, size: Int, length: Int, vsegm: String, jsegm: String, entries: Seq[MotifClusterEntry], meta: MotifClusterMeta)

object MotifCluster {
  implicit val motifClusterFormat: Format[MotifCluster] = Json.format[MotifCluster]

  def fromTable(table: Table): MotifCluster = {
    val cid = table.stringColumn("cid").asSet.asScala
    val csz = table.intColumn("csz").asList.asScala.toSet
    val len = table.intColumn("len").asList.asScala.toSet
    val v = table.stringColumn("v.segm.repr").asList.asScala.toSet
    val j = table.stringColumn("j.segm.repr").asList.asScala.toSet

    assert(cid.size == 1 && csz.size == 1 && len.size == 1 && v.size == 1 && j.size == 1)

    val clusterId = cid.head
    val size = csz.head
    val length = len.head
    val entries = table.splitOn(table.intColumn("pos")).asTableList().asScala.map(MotifClusterEntry.fromTable)

    val species = table.stringColumn("species").asSet.asScala
    val gene = table.stringColumn("gene").asSet.asScala
    val mhcclass = table.stringColumn("mhc.class").asSet.asScala
    val mhca = table.stringColumn("mhc.a").asSet.asScala

    assert(species.size == 1 && gene.size == 1 && mhcclass.size == 1 && mhca.size == 1)

    val meta = MotifClusterMeta(species.head, gene.head, mhcclass.head, mhca.head)

    MotifCluster(clusterId, size, length, v.head, j.head, entries, meta)
  }
}

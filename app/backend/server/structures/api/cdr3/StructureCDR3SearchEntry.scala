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

package backend.server.structures.api.cdr3

import backend.server.structures.api.epitope.StructureCluster
import play.api.libs.json.{Format, Json}

case class StructureCDR3SearchEntry(info: Double, cdr3: String, cluster: StructureCluster) {

  override def equals(obj: Any): Boolean = {
    obj match {
      case that: StructureCDR3SearchEntry => that.info == this.info && that.cluster.equals(this.cluster)
      case _ => false
    }
  }

  override def hashCode(): Int = info.hashCode() + cluster.hashCode()

}

object StructureCDR3SearchEntry {
  implicit val structureCDR3SearchEntry: Format[StructureCDR3SearchEntry] = Json.format[StructureCDR3SearchEntry]
}

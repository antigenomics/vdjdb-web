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

package backend.server.motifs.api.cdr3

import backend.server.motifs.api.epitope.MotifCluster
import play.api.libs.json.{Format, Json}

case class MotifCDR3SearchEntry(info: Double, cdr3: String, cluster: MotifCluster) {

  override def equals(obj: Any): Boolean = {
    obj match {
      case that: MotifCDR3SearchEntry => that.info == this.info && that.cluster.equals(this.cluster)
      case _ => false
    }
  }

  override def hashCode(): Int = info.hashCode() + cluster.hashCode()

}

object MotifCDR3SearchEntry {
  implicit val motifCDR3SearchEntry: Format[MotifCDR3SearchEntry] = Json.format[MotifCDR3SearchEntry]
}

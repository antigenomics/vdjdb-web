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

package backend.server.motifs

import play.api.libs.json.{Format, Json}

case class MotifCluster(cid: String, size: Int, entries: Seq[MotifClusterEntry])

object MotifCluster {
    implicit val motifCluster: Format[MotifCluster] = Json.format[MotifCluster]

    def fromStream(header: Map[String, Int], stream: Stream[Array[String]]): Seq[MotifCluster] = {
        stream.groupBy(_ (header(Motifs.CLUSTER_ID_HEADER_NAME))).map {
            case (cid, s) =>
                val csz = s.map(_(header(Motifs.CLUSTER_SIZE_HEADER_NAME))).toSet

                require(csz.size == 1)

                MotifCluster(cid, csz.head.toInt, MotifClusterEntry.fromStream(header, s))
        }.toSeq
    }
}

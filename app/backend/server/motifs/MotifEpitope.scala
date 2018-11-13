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

case class MotifEpitope(epitope: String, mhca: String, mhcb: String, clusters: Seq[MotifCluster])

object MotifEpitope {
    implicit val motifEpitopeFormat: Format[MotifEpitope] = Json.format[MotifEpitope]

    def fromStream(header: Map[String, Int], stream: Stream[Array[String]]): Seq[MotifEpitope] = {
        val mhca = stream.map(_(header(Motifs.MHC_A_HEADER_NAME))).toSet

        require(mhca.size == 1)

        stream.groupBy(_(header(Motifs.EPITOPE_HEADER_NAME))).flatMap {
            case (epitope, epitopeStream) =>
                epitopeStream.groupBy(_(header(Motifs.MHC_B_HEADER_NAME))).map {
                    case (mhcb, s) => MotifEpitope(epitope, mhca.head, mhcb, MotifCluster.fromStream(header, s))
                }
        }.toSeq
    }
}

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

case class MotifClusterEntryAA(aa: String, len: Int, count: Int, F: Double, I: Double, H: Double)

object MotifClusterEntryAA {
    implicit val motifClusterEntryAAFormat: Format[MotifClusterEntryAA] = Json.format[MotifClusterEntryAA]

    def fromStream(header: Map[String, Int], stream: Stream[Array[String]]): Seq[MotifClusterEntryAA] = {
        stream.map { line =>
            MotifClusterEntryAA(
                line(header(Motifs.AA_CHAR_HEADER_NAME)),
                line(header(Motifs.LEN_HEADER_NAME)).toInt,
                line(header(Motifs.COUNT_HEADER_NAME)).toInt,
                line(header(Motifs.FREQ_HEADER_NAME)).toDouble,
                line(header(Motifs.INFORMATIVENESS_HEADER_NAME)).toDouble,
                line(header(Motifs.HEIGHT_HEADER_NAME)).toDouble,
            )
        }
    }
}

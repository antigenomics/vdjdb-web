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

case class MotifClusterEntry(pos: Int, aa: Seq[MotifClusterEntryAA])

object MotifClusterEntry {
    implicit val motifClusterEntryFormat: Format[MotifClusterEntry] = Json.format[MotifClusterEntry]

    def fromStream(header: Map[String, Int], stream: Stream[Array[String]]): Seq[MotifClusterEntry] = {
        stream.groupBy(_(header(Motifs.AA_CHAR_POSITION_HEADER_NAME))).map {
            case (position, s) => MotifClusterEntry(position.toInt, MotifClusterEntryAA.fromStream(header, s))
        }.toSeq
    }
}

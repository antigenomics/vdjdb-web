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

//case class MotifsMetadataSpeciesEntry(species: String, genes: Seq[MotifsMetadataGeneEntry])
//
//case class MotifsMetadataGeneEntry(gene: String, mhcs: Seq[MotifsMetadataMHCEntry])
//
//case class MotifsMetadataMHCEntry(mhc: String, mhcas: Seq[MotifsMetadataMHCAEntry])
//
//case class MotifsMetadataMHCAEntry(mhca: String, entries: Option[Seq[MotifsMetadataEntry]])

case class MotifsMetadataEntry(species: String, gene: String, mhc: String, mhca: String, epitopes: Seq[MotifEpitope])

object MotifsMetadataEntry {
    implicit val motifsMetadataEntry: Format[MotifsMetadataEntry] = Json.format[MotifsMetadataEntry]
//    implicit val motifsMetadataMHCAEntry: Format[MotifsMetadataMHCAEntry] = Json.format[MotifsMetadataMHCAEntry]
//    implicit val motifsMetadataMHCEntry: Format[MotifsMetadataMHCEntry] = Json.format[MotifsMetadataMHCEntry]
//    implicit val motifsMetadataGeneEntry: Format[MotifsMetadataGeneEntry] = Json.format[MotifsMetadataGeneEntry]
//    implicit val motifsMetadataSpeciesEntry: Format[MotifsMetadataSpeciesEntry] = Json.format[MotifsMetadataSpeciesEntry]

    def fromStream(header: Map[String, Int], species: String, gene: String, mhc: String, mhca: String, stream: Stream[Array[String]]): MotifsMetadataEntry = {
        MotifsMetadataEntry(species, gene, mhc, mhca, MotifEpitope.fromStream(header, stream))
    }
}

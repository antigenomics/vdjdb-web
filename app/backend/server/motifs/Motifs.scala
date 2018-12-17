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

import java.io.File

import backend.server.database.Database
import javax.inject.{Inject, Singleton}
import play.api.Configuration

import scala.io.Source

@Singleton
class Motifs @Inject()(configuration: Configuration, database: Database) {
    private final val header: Map[String, Int] = Motifs.parseMotifsHeader(database.getMotifFile)
    private final val metadata: MotifsMetadata = Motifs.parseMotifsCollection(database.getMotifFile, header)

    def getMetadata: MotifsMetadata = metadata
}

object Motifs {

    val SPECIES_HEADER_NAME = "species"
    val GENE_HEADER_NAME = "gene"
    val MHC_CLASS_HEADER_NAME = "mhc.class"
    val MHC_A_HEADER_NAME = "mhc.a"
    val MHC_B_HEADER_NAME = "mhc.b"
    val EPITOPE_HEADER_NAME = "epitope"
    val CLUSTER_ID_HEADER_NAME = "cid"
    val CLUSTER_SIZE_HEADER_NAME = "csz"
    val AA_CHAR_HEADER_NAME = "aa"
    val AA_CHAR_POSITION_HEADER_NAME = "pos"
    val LEN_HEADER_NAME = "len"
    val COUNT_HEADER_NAME = "count"
    val FREQ_HEADER_NAME = "freq"
    val INFORMATIVENESS_HEADER_NAME = "I"
    val HEIGHT_HEADER_NAME = "height"

    val HEADER_NAMES = List(
        SPECIES_HEADER_NAME,
        GENE_HEADER_NAME,
        MHC_CLASS_HEADER_NAME,
        MHC_A_HEADER_NAME,
        MHC_B_HEADER_NAME,
        EPITOPE_HEADER_NAME,
        CLUSTER_ID_HEADER_NAME,
        CLUSTER_SIZE_HEADER_NAME,
        AA_CHAR_HEADER_NAME,
        AA_CHAR_POSITION_HEADER_NAME,
        LEN_HEADER_NAME,
        COUNT_HEADER_NAME,
        FREQ_HEADER_NAME,
        INFORMATIVENESS_HEADER_NAME,
        HEIGHT_HEADER_NAME,
    )

    def parseMotifsHeader(motifsFile: Option[File]): Map[String, Int] = {
        motifsFile match {
            case Some(file) =>
                val header = Source.fromFile(file).getLines().next().split("\t")
                HEADER_NAMES.map(name => name -> header.indexOf(name)).toMap
            case None => Map()
        }
    }

    def parseMotifsCollection(motifsFile: Option[File], header: Map[String, Int]): MotifsMetadata = {
        motifsFile match {
            case Some(file) =>
                val metadata = Source.fromFile(file)
                    .getLines.drop(1) // Drop header
                    .toStream // Stream execution
                    .map(line => line.toString.split("\t")) // Split tab-delimited lines
                    .groupBy(_ (header(SPECIES_HEADER_NAME))) // Group by species
                    .map(species =>
                    species._1 -> species._2.groupBy(_ (header(GENE_HEADER_NAME))) // Group by gene
                        .map(gene => gene._1 -> gene._2.groupBy(_ (header(MHC_CLASS_HEADER_NAME))) // Group by MHC.class
                        .map(mhcclass => mhcclass._1 -> mhcclass._2.groupBy(_ (header(MHC_A_HEADER_NAME)))) // Group by MHC group (for now it is just MHC.A)
                    )
                )

                val entries = metadata.flatMap {
                    case (species, genes) => genes.flatMap {
                        case (gene, mhcclasses) => mhcclasses.flatMap {
                            case (mhcclass, mhcgroups) => mhcgroups.map {
                                case (mhcgroup, stream) => MotifsMetadataEntry.fromStream(header, species, gene, mhcclass, mhcgroup, stream)
                            }.toSeq
                        }
                    }
                }.toSeq

                MotifsMetadata(entries)
            case None => MotifsMetadata(entries = Seq())
        }
    }

}

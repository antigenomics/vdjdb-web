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
    private final val metadata: MotifsMetadata = Motifs.parseMotifsCollection(database.getMotifFile)

    def getMetadata: MotifsMetadata = metadata

}

object Motifs {

    def parseMotifsCollection(motifsFile: Option[File]): MotifsMetadata = {
        val SpeciesPosition = 0
        val GenePosition = 5
        val MHCClassPosition = 3
        val MHCAPosition = 1

        motifsFile match {
            case Some(file) =>
                val metadata = Source.fromFile(file)
                    .getLines.drop(1)                               // Drop header
                    .toStream                                       // Stream execution
                    .map(line => line.toString.split("\t")) // Split tab-delimited lines
                    .groupBy(_(SpeciesPosition))                    // Group by species
                    .map(species =>
                        species._1 -> species._2.groupBy(_(GenePosition))                // Group by gene
                            .map(gene => gene._1 -> gene._2.groupBy(_(MHCClassPosition)) // Group by MHC.class
                                .map(mhc => mhc._1 -> mhc._2.groupBy(_(MHCAPosition)))   // Group by MHC.A
                            )
                    )

                println(metadata)
                MotifsMetadata(entries = List(MotifsMetadataEntry("blabla", "blablabla", "gene", List())))
            case None => MotifsMetadata(entries = List())
        }
    }

}

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

package backend.server.motifs

import tech.tablesaw.api.Table

/** Everything one clustering method offers, derived from its two files.
  *
  * TCRNet and TCREMP produce the same shape of output from different algorithms, so the browser
  * serves them from the same code with the dataset swapped underneath. Holding that as a value
  * rather than as parallel fields is what keeps the two from drifting: adding a derived index means
  * one line here instead of two fields and an accessor that picks between them by name.
  *
  * All five derived values are computed once at startup, because every one of them is a full scan of
  * a table that does not change while the application is running.
  */
case class MotifDataset(members: Table,
                        table: Table,
                        cdr3Range: (Int, Int),
                        availabilityKeys: Set[String],
                        cidLookupIndex: Map[String, String],
                        metadata: MotifsMetadata)

object MotifDataset {

  /** Both paths are optional: a deployment can be missing either file, and the parsers answer with
    * an empty table rather than failing, so the tab renders empty instead of the app not starting. */
  def load(motifFile: Option[String], membersFile: Option[String], metadataLevels: Seq[String]): MotifDataset = {
    val members = Motifs.parseClusterMembersFileIntoDataFrame(membersFile)
    val table = Motifs.parseMotifFileIntoDataFrame(motifFile)
    MotifDataset(
      members          = members,
      table            = table,
      cdr3Range        = Motifs.parseCDR3LengthRange(table),
      availabilityKeys = Motifs.buildAvailabilityKeys(table),
      cidLookupIndex   = Motifs.buildCidLookupIndex(members),
      metadata         = MotifsMetadata.generateMetadataFromLevels(table, metadataLevels))
  }
}

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

package backend.server.structures.api

import play.api.libs.json.{Format, Json}

/** What `POST /api/structures/filter` returns: the epitopes under the selected tree path, each
  * carrying its structures.
  *
  * One file rather than the seven it used to be. Every one of those held a single case class and a
  * `Json.format` under a fifteen-line licence header, so the header outweighed the payload and the
  * shape of the response could not be read without opening all of them.
  */
case class StructuresSearchTreeFilterResult(epitopes: Seq[StructureEpitope])

object StructuresSearchTreeFilterResult {
  implicit val format: Format[StructuresSearchTreeFilterResult] = Json.format[StructuresSearchTreeFilterResult]
}

case class StructureEpitope(epitope: String, hash: String, clusters: Seq[StructureCluster])

object StructureEpitope {
  implicit val format: Format[StructureEpitope] = Json.format[StructureEpitope]
}

/** One modelled or experimental TCR-pMHC structure.
  *
  * `clusterId` is the structure's own id and the join key everywhere else; `displayId` is the motif
  * cluster id (or ids, joined by " / ") this structure's chains belong to, which is what the card
  * shows and what the motif links are built from. Empty when no motif cluster matches.
  */
case class StructureCluster(clusterId: String,
                            displayId: String,
                            tcrPairLabel: String,
                            size: Int,
                            length: Int,
                            vsegm: String,
                            jsegm: String,
                            meta: StructureClusterMeta,
                            visualization: Option[StructureVisualization],
                            cdr3aVEnd: Int = -1,
                            cdr3aJStart: Int = -1,
                            cdr3bVEnd: Int = -1,
                            cdr3bJStart: Int = -1,
                            metrics: Option[StructureModelMetrics] = None)

object StructureCluster {
  implicit val format: Format[StructureCluster] = Json.format[StructureCluster]
}

case class StructureClusterMeta(species: String,
                                gene: String,
                                mhcclass: String,
                                mhca: String,
                                mhcb: String,
                                antigenGene: String,
                                antigenSpecies: String,
                                cellSubset: String)

object StructureClusterMeta {
  implicit val format: Format[StructureClusterMeta] = Json.format[StructureClusterMeta]
}

/** Where the contact map is served from. `simpleUrl` is the lighter variant the overlay draws for
  * every layer behind the front one, and is absent when the generator did not produce one. */
case class StructureVisualization(url: String, kind: String, simpleUrl: Option[String] = None)

object StructureVisualization {
  implicit val format: Format[StructureVisualization] = Json.format[StructureVisualization]
}

/** Per-model TCR-pMHC confidence metrics, joined by structure hash from the
  * `structures_metadata.tsv` companion file (see tools/build_structures_metadata.py).
  *
  * `iptm` is the TCR:pMHC interface ipTM (`tcr_pmhc_iptm`), `confidence` the AlphaFold2 ranking
  * confidence, and the `*Pct` fields their percentile rank among all modelled structures
  * (`is_native == false`). Every model-specific field is empty for a native, experimentally
  * determined structure, which is why they are all optional rather than defaulted.
  */
case class StructureModelMetrics(isNative: Boolean,
                                 numContacts: Option[Int],
                                 iptm: Option[Double],
                                 confidence: Option[Double],
                                 iptmPct: Option[Int],
                                 confidencePct: Option[Int],
                                 bindingModeOutlier: Option[Boolean])

object StructureModelMetrics {
  implicit val format: Format[StructureModelMetrics] = Json.format[StructureModelMetrics]
}

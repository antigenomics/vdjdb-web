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

package backend.server.structures.api.epitope

import play.api.libs.json.{Format, Json}

// Per-model TCR-pMHC confidence metrics, joined by structure hash from the
// `structures_metadata.tsv` companion file (see tools/build_structures_metadata.py).
// iptm = TCR:pMHC interface ipTM (tcr_pmhc_iptm); confidence = AlphaFold2 ranking
// confidence; *Pct = percentile rank among all modelled structures (is_native == false).
// Model-specific fields are empty for native (experimental PDB) structures.
case class StructureModelMetrics(isNative: Boolean,
                                 numContacts: Option[Int],
                                 iptm: Option[Double],
                                 confidence: Option[Double],
                                 iptmPct: Option[Int],
                                 confidencePct: Option[Int],
                                 bindingModeOutlier: Option[Boolean])

object StructureModelMetrics {
  implicit val structureModelMetricsFormat: Format[StructureModelMetrics] = Json.format[StructureModelMetrics]
}

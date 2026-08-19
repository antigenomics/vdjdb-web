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

/** `POST /api/structures/cdr3`: find the structures whose CDR3 matches a query.
  *
  * `gene` is `TRA`, `TRB` or `BOTH`; `top` is capped by `StructureCdr3Search.MaxResults`.
  */
case class StructureCdr3SearchRequest(cdr3: String, substring: Boolean, gene: String, top: Int)

object StructureCdr3SearchRequest {
  implicit val format: Format[StructureCdr3SearchRequest] = Json.format[StructureCdr3SearchRequest]
}

/** The request echoed back, so a result can be read without the request that produced it. */
case class StructureCdr3SearchResultOptions(cdr3: String, top: Int, gene: String, substring: Boolean)

object StructureCdr3SearchResultOptions {
  implicit val format: Format[StructureCdr3SearchResultOptions] = Json.format[StructureCdr3SearchResultOptions]
}

/** One hit. `cdr3` is the matched pattern with the flanks masked for a substring search; `chain`
  * names which of the pair matched, and is absent when the query cannot be attributed to one. */
case class StructureCdr3SearchEntry(info: Double, cdr3: String, chain: Option[String], cluster: StructureCluster) {

  // Hand-written because `info` is a Double computed from counts: two entries for the same structure
  // must compare equal for the de-duplication in StructureCdr3Search to work, and case-class equality
  // over a Double would be at the mercy of the last bit.
  override def equals(other: Any): Boolean = other match {
    case that: StructureCdr3SearchEntry =>
      that.info == this.info && that.cdr3 == this.cdr3 && that.chain == this.chain && that.cluster == this.cluster
    case _ => false
  }

  override def hashCode(): Int = info.hashCode() + cdr3.hashCode() + chain.hashCode() + cluster.hashCode()
}

object StructureCdr3SearchEntry {
  implicit val format: Format[StructureCdr3SearchEntry] = Json.format[StructureCdr3SearchEntry]
}

/** `clusters` ranked by raw count, `clustersNorm` by count normalised against cluster size - the UI
  * offers both because a large cluster wins the first ranking almost by construction. */
case class StructureCdr3SearchResult(options: StructureCdr3SearchResultOptions,
                                     clusters: Seq[StructureCdr3SearchEntry],
                                     clustersNorm: Seq[StructureCdr3SearchEntry])

object StructureCdr3SearchResult {
  implicit val format: Format[StructureCdr3SearchResult] = Json.format[StructureCdr3SearchResult]
}

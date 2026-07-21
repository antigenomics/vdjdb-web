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

package backend.server.annotations.api.filters

import play.api.libs.json.{Format, Json}

/** @param hla donor HLA typing to restrict matches to, as free text (`HLA-A*02:01, B*07:02`).
  *            Empty or absent means no HLA restriction. Kept as raw text rather than a parsed list so
  *            the parsing rules live in exactly one place, server-side — see [[backend.server.annotations.HlaAllele]].
  * @param inTcrempMotif keep only matches whose VDJdb record is a member of a TCREMP motif cluster
  *                      (`cluster_members_tcremp.txt`). On by default in the UI: TCREMP names ~99.5k of
  *                      the ~146k distinct records, so it drops roughly a third of the database.
  * @param inTcrnetMotif same, against the TCRNET clusters (`cluster_members.txt`, ~41k records). Off by
  *                      default. Combined with the TCREMP flag it is an AND, not an OR — the search page
  *                      ORs its motif modes, this one intentionally narrows.
  * @param independentValidationOnly keep only matches flagged `evidence.validation.independent` — the
  *                      curated "specificity independently validated in another study" column, the same
  *                      one the search page filters on.
  * @param minConfidenceScore keep only matches whose `vdjdb.score` is at least this value. Absent or 0
  *                           means no restriction; the UI offers 1 as a checkbox. `>= 1` retains only
  *                           ~8% of records (0 → 133,576 rows, 1 → 5,764, 2 → 3,014, 3 → 3,701), which is
  *                           why it is off by default.
  *
  * The five filters above are all `Option`, so a client that predates them still parses — `Json.format`
  * reads a missing `Option` field as `None`.
  *
  * Nothing in this class reaches a database build any more. `species`, `gene` and `mhc` used to
  * select the rows a per-request index was built from; they are now
  * predicates over the results of one shared index, alongside the five above — see
  * [[backend.server.annotations.IntersectionTable]].
  * The one input the index still depends on is the search scope, which lives in
  * [[AnnotationsSearchScope]].
  */
case class AnnotationsDatabaseQueryParams(species: String, gene: String, mhc: String, hla: Option[String],
                                          inTcrempMotif: Option[Boolean], inTcrnetMotif: Option[Boolean],
                                          independentValidationOnly: Option[Boolean], minConfidenceScore: Option[Int])

object AnnotationsDatabaseQueryParams {
  implicit val annotationsDatabaseQueryParamsFormat: Format[AnnotationsDatabaseQueryParams] = Json.format[AnnotationsDatabaseQueryParams]
}

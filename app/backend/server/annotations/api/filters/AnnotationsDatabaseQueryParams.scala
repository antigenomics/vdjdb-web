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
  */
case class AnnotationsDatabaseQueryParams(species: String, gene: String, mhc: String, confidenceThreshold: Int,
                                          minEpitopeSize: Int, hla: Option[String])

object AnnotationsDatabaseQueryParams {
  implicit val annotationsDatabaseQueryParamsFormat: Format[AnnotationsDatabaseQueryParams] = Json.format[AnnotationsDatabaseQueryParams]
}

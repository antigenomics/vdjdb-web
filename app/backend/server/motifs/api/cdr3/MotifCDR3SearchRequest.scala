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

package backend.server.motifs.api.cdr3

import play.api.libs.json.{Format, Json}

case class MotifCDR3SearchRequest(cdr3: String, top: Int)

object MotifCDR3SearchRequest {
  implicit val motifCDR3SearchFormat: Format[MotifCDR3SearchRequest] = Json.format[MotifCDR3SearchRequest]
}

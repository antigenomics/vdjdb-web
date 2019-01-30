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

package backend.server.annotations

import backend.server.search.SearchTableRow
import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import play.api.libs.json.{Json, Writes}

case class IntersectionTableRowMatch(row: SearchTableRow, alignment: IntersectionTableRowAlignment, matchScore: Float, weight: Float)

object IntersectionTableRowMatch {
  implicit val intersectionTableRowMatchWrites: Writes[IntersectionTableRowMatch] = Json.writes[IntersectionTableRowMatch]

  def createFromSearchResult(result: ClonotypeSearchResult): IntersectionTableRowMatch = {
    val alignment = result.getHit.computeAlignment()

    IntersectionTableRowMatch(
      SearchTableRow.createFromRow(result.getRow),
      IntersectionTableRowAlignment.createFromAlignmentHelper(alignment.getAlignmentHelper), result.getScore, result.getWeight)
  }
}

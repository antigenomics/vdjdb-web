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

import com.milaboratory.core.alignment.AlignmentHelper
import play.api.libs.json.{Json, Writes}

case class IntersectionTableRowAlignment(seq1String: String, markup: String, seq2String: String)

object IntersectionTableRowAlignment {
  implicit val intersectionTableRowAlignmentWrites: Writes[IntersectionTableRowAlignment] = Json.writes[IntersectionTableRowAlignment]

  def createFromAlignmentHelper(helper: AlignmentHelper): IntersectionTableRowAlignment = {
    IntersectionTableRowAlignment(helper.getSeq1String, helper.getMarkup, helper.getSeq2String)
  }
}

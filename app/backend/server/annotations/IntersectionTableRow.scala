/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

package backend.server.annotations

import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import com.antigenomics.vdjtools.sample.Clonotype
import play.api.libs.json.{Json, Writes}

case class IntersectionTableRow(entries: Seq[String], matches: Seq[IntersectionTableRowMatch], metadata: IntersectionTableRowMetadata)

object IntersectionTableRow {
    implicit val intersectTableRowWrites: Writes[IntersectionTableRow] = Json.writes[IntersectionTableRow]

    def createFromSearchResult(searchResult: (Clonotype, Seq[ClonotypeSearchResult])): IntersectionTableRow = {
        val clonotype = searchResult._1
        val results = searchResult._2
        val id = results.head.getId
        IntersectionTableRow(
            Seq(id.toString, results.size.toString,
                clonotype.getFreq.toString, clonotype.getCount.toString,
                clonotype.getCdr3aa, clonotype.getV, clonotype.getJ),
            results.map(IntersectionTableRowMatch.createFromSearchResult),
            IntersectionTableRowMetadata(clonotype.getVEnd, clonotype.getJStart, clonotype.getCdr3nt))
    }
}

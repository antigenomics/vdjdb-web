/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.server.search

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.{Json, OWrites}

case class SearchTableRowMetadata(pairedID: String, cdr3vEnd: Int, cdr3jStart: Int)

object SearchTableRowMetadata {
    implicit val searchTableRowMetadataWrites: OWrites[SearchTableRowMetadata] = Json.writes[SearchTableRowMetadata]

    def createFromRow(r: Row) : SearchTableRowMetadata = {
        val cdr3fix = Json.parse(r.getAt("cdr3fix").getValue)

        val cdr3vEnd = (cdr3fix \ "vEnd").validate[Int].asOpt.getOrElse(-1)
        val cdr3jStart = (cdr3fix \ "jStart").validate[Int].asOpt.getOrElse(-1)

        SearchTableRowMetadata(r.getAt("complex.id").getValue, cdr3vEnd, cdr3jStart)
    }
}

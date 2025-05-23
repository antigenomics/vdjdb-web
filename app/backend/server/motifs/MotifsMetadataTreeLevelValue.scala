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

package backend.server.motifs

import play.api.libs.json._

case class MotifsMetadataTreeLevelValue(value: String, hash: Option[String], next: Option[MotifsMetadataTreeLevel])

object MotifsMetadataTreeLevelValue {
  implicit val motifsMetadataTreeLevelValueReads: Reads[MotifsMetadataTreeLevelValue] = Json.reads[MotifsMetadataTreeLevelValue]
  implicit val motifsMetadataTreeLevelValueWrites: Writes[MotifsMetadataTreeLevelValue] = new Writes[MotifsMetadataTreeLevelValue] {
    override def writes(o: MotifsMetadataTreeLevelValue): JsValue = JsObject(Seq(
      "value" -> JsString(o.value),
      "hash" -> Json.toJson(o.hash match {
        case Some(str) => JsString(str)
        case None => JsNull
      }),
      "next" -> Json.toJson(o.next match {
        case Some(level) => MotifsMetadataTreeLevel.motifsMetadataTreeLevelFormat.writes(level)
        case None => JsNull
      })
    ))
  }
}

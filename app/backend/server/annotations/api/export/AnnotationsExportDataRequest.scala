/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

package backend.server.annotations.api.export

import backend.server.search.api.export.ExportOptionFlag
import play.api.libs.json.{Json, Reads}

case class AnnotationsExportDataRequest(sampleName: String, format: String, options: Seq[ExportOptionFlag])

object AnnotationsExportDataRequest {
    implicit val exportOptionFlagReads: Reads[ExportOptionFlag] = Json.reads[ExportOptionFlag]
    implicit val annotationsExportDataRequestReads: Reads[AnnotationsExportDataRequest] = Json.reads[AnnotationsExportDataRequest]
}
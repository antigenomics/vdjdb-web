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

package backend.models.files.sample

import com.antigenomics.vdjtools.misc.Software
import play.api.data.Form
import play.api.data.Forms.{mapping, nonEmptyText}

case class SampleFileForm(name: String, software: String)

object SampleFileForm {
    implicit val sampleFileFormMapping: Form[SampleFileForm] = Form(mapping(
        "name" -> nonEmptyText(maxLength = 64),
        "software" -> nonEmptyText(maxLength = 64)
    )(SampleFileForm.apply)(SampleFileForm.unapply) verifying("sample.file.form.invalid.software", { sampleFileForm =>
        Software.values().map(_.toString).contains(sampleFileForm.software)
    }) verifying("sample.file.form.invalid.name", { sampleFileForm =>
        sampleFileForm.name.nonEmpty && SampleFileTable.isSampleNameValid(sampleFileForm.name)
    }))
}

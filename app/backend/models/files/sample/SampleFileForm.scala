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
import play.api.data.Forms.{default, mapping, nonEmptyText}

/** @param species declared sample species
  * @param chain   declared chain. Only load-bearing on the legacy-passthrough path, where the file is
  *                stored unparsed and nothing else can tell us the chain; otherwise the chain actually
  *                found in the data wins.
  */
case class SampleFileForm(name: String, software: String, species: String, chain: String)

object SampleFileForm {
  final val DefaultSpecies = "HomoSapiens"
  final val DefaultChain   = "TRB"

  // Must stay identical to the client lists in upload-table-row.component.ts and to the annotate
  // filters in database-query-params.component.html.
  final val Species: Seq[String] = Seq("HomoSapiens", "MusMusculus", "MacacaMulatta")
  final val Chains: Seq[String]  = Seq("TRA", "TRB")

  implicit val sampleFileFormMapping: Form[SampleFileForm] = Form(mapping(
    "name" -> nonEmptyText(maxLength = 64),
    "software" -> nonEmptyText(maxLength = 64),
    // `default`, not bare text: a cached copy of the old SPA does not send these fields, and it should
    // keep uploading rather than fail with "Species field is missing".
    "species" -> default(nonEmptyText(maxLength = 32), SampleFileForm.DefaultSpecies),
    "chain" -> default(nonEmptyText(maxLength = 8), SampleFileForm.DefaultChain)
  )(SampleFileForm.apply)(SampleFileForm.unapply) verifying("sample.file.form.invalid.software", { sampleFileForm =>
    Software.values().map(_.toString).contains(sampleFileForm.software)
  }) verifying("sample.file.form.invalid.name", { sampleFileForm =>
    sampleFileForm.name.nonEmpty && SampleFileTable.isSampleNameValid(sampleFileForm.name)
  }) verifying("sample.file.form.invalid.species", { sampleFileForm =>
    Species.contains(sampleFileForm.species)
  }) verifying("sample.file.form.invalid.chain", { sampleFileForm =>
    Chains.contains(sampleFileForm.chain)
  }))
}

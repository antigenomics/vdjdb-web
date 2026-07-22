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

import backend.server.annotations.api.filters.{AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import org.scalatest.{Matchers, WordSpec}

class ControlPriorSpec extends WordSpec with Matchers {

  /** The filter state `AnnotationsFilters` ships, which is what the control repertoires were annotated
    * under. Every case below is this with one thing changed. */
  private val defaults = AnnotationsDatabaseQueryParams("HomoSapiens", "TRB", "MHCI+II", None,
    Some(false), Some(false), Some(false), Some(1))

  private val scope = AnnotationsSearchScope(matchV = false, matchJ = false,
    hammingDistance = AnnotationsSearchScopeHammingDistance.Hamming)

  "ControlPrior.measuredUnder" should {
    "accept the shipped defaults" in {
      ControlPrior.measuredUnder(defaults, scope) shouldBe true
    }

    "accept an absent HLA either way it can be absent" in {
      ControlPrior.measuredUnder(defaults.copy(hla = Some("")), scope) shouldBe true
      ControlPrior.measuredUnder(defaults.copy(hla = Some("  ")), scope) shouldBe true
    }

    // Each of these makes the request narrower than the control run, in a way the table cannot be
    // corrected for - so the answer has to be "not measured" rather than a p-value against the wrong
    // population.
    "reject every narrowing the control run did not apply" in {
      val narrowed = Seq(
        defaults.copy(mhc = "MHCI"),
        defaults.copy(hla = Some("HLA-A*02:01")),
        defaults.copy(inTcrempMotif = Some(true)),
        defaults.copy(inTcrnetMotif = Some(true)),
        defaults.copy(independentValidationOnly = Some(true)),
        defaults.copy(minConfidenceScore = Some(2)))
      narrowed.foreach(parameters => ControlPrior.measuredUnder(parameters, scope) shouldBe false)
    }

    // Confidence is the one filter that is on by default, so "off" is as much a mismatch as "higher".
    "reject a confidence threshold below the one measured" in {
      ControlPrior.measuredUnder(defaults.copy(minConfidenceScore = Some(0)), scope) shouldBe false
      ControlPrior.measuredUnder(defaults.copy(minConfidenceScore = None), scope) shouldBe false
    }

    "reject V or J matching" in {
      ControlPrior.measuredUnder(defaults, scope.copy(matchV = true)) shouldBe false
      ControlPrior.measuredUnder(defaults, scope.copy(matchJ = true)) shouldBe false
    }
  }

  "ControlPrior.Population" should {
    val population = ControlPrior.Population(Map("EPLPQGQLTAY" -> 42, "YLEPGPVTA" -> 217), 100000L)

    "carry the measured count with half a pseudocount on each side" in {
      population.betaFor("EPLPQGQLTAY") shouldBe ((42.5, 99958.5))
      population.betaFor("YLEPGPVTA") shouldBe ((217.5, 99783.5))
    }

    // The whole point of the pseudocount: without it this epitope's null rate is exactly zero, under
    // which one match in a donor is infinitely surprising and every never-reached epitope tops the
    // chart. With it the mean rate is 1/200001, which is what "not seen in 100k" actually supports.
    "give an epitope the control never reached a floor rather than nothing" in {
      val (alpha, beta) = population.betaFor("NEVERSEEN")
      alpha shouldBe 0.5
      beta shouldBe 100000.5
      (alpha / (alpha + beta)) should be > 0.0
    }
  }

  "AnnotationsSearchScopeHammingDistance.priorName" should {
    // The generator writes rows under these names and the loader looks them up by them; a rename on
    // one side alone silently costs every p-value.
    "name each offered scope" in {
      AnnotationsSearchScopeHammingDistance.Offered.map(AnnotationsSearchScopeHammingDistance.priorName) shouldBe
        Seq("exact", "hamming1", "hamming2", "levenshtein1")
    }

    "snap an unoffered scope onto the preset it sanitizes to" in {
      AnnotationsSearchScopeHammingDistance.priorName(
        AnnotationsSearchScopeHammingDistance(substitutions = 9, insertions = 0, deletions = 0, total = 9)) shouldBe "hamming2"
    }
  }
}

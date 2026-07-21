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

package backend.server.annotations.api.filters

import backend.BaseTestSpec
import backend.actions.UtilsTestTag

class AnnotationsSearchScopeHammingDistanceSpec extends BaseTestSpec {

  private def scope(substitutions: Int, insertions: Int, deletions: Int, total: Int) =
    AnnotationsSearchScopeHammingDistance(substitutions, insertions, deletions, total)

  "AnnotationsSearchScopeHammingDistance" should {

    "offer exactly two searches" taggedAs UtilsTestTag in {
      AnnotationsSearchScopeHammingDistance.Hamming shouldEqual scope(1, 0, 0, 1)
      // total = 1, not 3: one edit of any kind, not one of each.
      AnnotationsSearchScopeHammingDistance.Levenshtein shouldEqual scope(1, 1, 1, 1)
    }

    "keep each preset unchanged" taggedAs UtilsTestTag in {
      val hamming     = AnnotationsSearchScopeHammingDistance.Hamming
      val levenshtein = AnnotationsSearchScopeHammingDistance.Levenshtein
      AnnotationsSearchScopeHammingDistance.sanitize(hamming) shouldEqual hamming
      AnnotationsSearchScopeHammingDistance.sanitize(levenshtein) shouldEqual levenshtein
    }

    "read any request for an indel as Levenshtein" taggedAs UtilsTestTag in {
      val levenshtein = AnnotationsSearchScopeHammingDistance.Levenshtein
      AnnotationsSearchScopeHammingDistance.sanitize(scope(0, 1, 0, 0)) shouldEqual levenshtein
      AnnotationsSearchScopeHammingDistance.sanitize(scope(0, 0, 1, 0)) shouldEqual levenshtein
      // Well past what the old per-field caps allowed - it still lands on the same two-edit-budget
      // search rather than on a scope nobody has reasoned about.
      AnnotationsSearchScopeHammingDistance.sanitize(scope(99, 99, 99, 99)) shouldEqual levenshtein
    }

    "read everything else as Hamming" taggedAs UtilsTestTag in {
      val hamming = AnnotationsSearchScopeHammingDistance.Hamming
      AnnotationsSearchScopeHammingDistance.sanitize(scope(0, 0, 0, 0)) shouldEqual hamming
      AnnotationsSearchScopeHammingDistance.sanitize(scope(3, 0, 0, 4)) shouldEqual hamming
      // Negatives arrive from a hand-rolled client as easily as anything else; they must not survive
      // into a SearchScope, where a negative budget is not a stricter search but an undefined one.
      AnnotationsSearchScopeHammingDistance.sanitize(scope(-5, -5, -5, -5)) shouldEqual hamming
    }

    "never emit a total below its largest component" taggedAs UtilsTestTag in {
      // The failure this replaces: a total under substitutions silently degraded the whole query to
      // the smaller budget, which reads to a user as records missing from the database.
      Seq(scope(3, 0, 0, 1), scope(0, 1, 1, 0), scope(2, 1, 0, 0), scope(0, 0, 0, 0)).map { input =>
        val out = AnnotationsSearchScopeHammingDistance.sanitize(input)
        out.total should be >= math.max(out.substitutions, math.max(out.insertions, out.deletions))
      }.last
    }
  }
}

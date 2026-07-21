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

    "offer exactly four searches" taggedAs UtilsTestTag in {
      AnnotationsSearchScopeHammingDistance.Exact shouldEqual scope(0, 0, 0, 0)
      AnnotationsSearchScopeHammingDistance.Hamming shouldEqual scope(1, 0, 0, 1)
      AnnotationsSearchScopeHammingDistance.Hamming2 shouldEqual scope(2, 0, 0, 2)
      // total = 1, not 3: one edit of any kind, not one of each.
      AnnotationsSearchScopeHammingDistance.Levenshtein shouldEqual scope(1, 1, 1, 1)
      AnnotationsSearchScopeHammingDistance.Offered should have size 4
    }

    "keep each preset unchanged" taggedAs UtilsTestTag in {
      AnnotationsSearchScopeHammingDistance.Offered.map { preset =>
        AnnotationsSearchScopeHammingDistance.sanitize(preset) shouldEqual preset
      }.last
    }

    "read any request for an indel as Levenshtein" taggedAs UtilsTestTag in {
      val levenshtein = AnnotationsSearchScopeHammingDistance.Levenshtein
      AnnotationsSearchScopeHammingDistance.sanitize(scope(0, 1, 0, 0)) shouldEqual levenshtein
      AnnotationsSearchScopeHammingDistance.sanitize(scope(0, 0, 1, 0)) shouldEqual levenshtein
      // Well past what the old per-field caps allowed - it still lands on a preset rather than on a
      // scope nobody has reasoned about.
      AnnotationsSearchScopeHammingDistance.sanitize(scope(99, 99, 99, 99)) shouldEqual levenshtein
    }

    "read a substitution-only request as the matching Hamming preset" taggedAs UtilsTestTag in {
      AnnotationsSearchScopeHammingDistance.sanitize(scope(0, 0, 0, 0)) shouldEqual
        AnnotationsSearchScopeHammingDistance.Exact
      AnnotationsSearchScopeHammingDistance.sanitize(scope(1, 0, 0, 1)) shouldEqual
        AnnotationsSearchScopeHammingDistance.Hamming
      AnnotationsSearchScopeHammingDistance.sanitize(scope(3, 0, 0, 4)) shouldEqual
        AnnotationsSearchScopeHammingDistance.Hamming2
      // Negatives arrive from a hand-rolled client as easily as anything else; they must not survive
      // into a SearchScope, where a negative budget is not a stricter search but an undefined one.
      AnnotationsSearchScopeHammingDistance.sanitize(scope(-5, -5, -5, -5)) shouldEqual
        AnnotationsSearchScopeHammingDistance.Exact
    }

    "build one index per width, with Exact riding on the Hamming one" taggedAs UtilsTestTag in {
      // This is what bounds the index cache: one entry per distinct index scope, not one per scope a
      // client can name. Exact shares because it is a sub-range of a one-substitution neighbourhood
      // and costs nothing extra to separate afterwards. The wider scopes deliberately do NOT share:
      // measured on the production database, serving Hamming from the Hamming2 index costs 5,270 ms
      // against 994 ms for the same 331,707 surviving hits.
      import AnnotationsSearchScopeHammingDistance._
      indexScope(Exact) shouldEqual Hamming
      indexScope(Hamming) shouldEqual Hamming
      indexScope(Hamming2) shouldEqual Hamming2
      indexScope(Levenshtein) shouldEqual Levenshtein
      Offered.map(indexScope).distinct should have size 3
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

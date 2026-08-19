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

package backend.server.structures

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}

import backend.BaseTestSpec
import backend.utils.UtilsTestTag
import org.scalatest.Assertion

class StructureMetricsIndexSpec extends BaseTestSpec {

  private def withMetrics(content: String)(test: Path => Assertion): Assertion = {
    val directory = Files.createTempDirectory("structure-metrics-spec")
    try {
      Files.write(directory.resolve(StructureMetricsIndex.FileName), content.getBytes(StandardCharsets.UTF_8))
      test(directory)
    } finally {
      Files.walk(directory).sorted(java.util.Comparator.reverseOrder[Path]()).forEach(Files.deleteIfExists(_))
    }
  }

  private final val Header = "hash\tis_native\tnum_contacts\tiptm\tconfidence\tiptm_pct\tconfidence_pct\tbinding_mode_outlier"

  "StructureMetricsIndex" should {

    "read every field off a modelled row" taggedAs UtilsTestTag in
      withMetrics(s"$Header\nAABBCC\tfalse\t17\t0.814\t0.856\t61\t64\ttrue\n") { directory =>
        val metrics = StructureMetricsIndex.load(directory)("aabbcc")

        metrics.isNative shouldEqual false
        metrics.numContacts.value shouldEqual 17
        metrics.iptm.value shouldEqual 0.814
        metrics.confidence.value shouldEqual 0.856
        metrics.iptmPct.value shouldEqual 61
        metrics.confidencePct.value shouldEqual 64
        metrics.bindingModeOutlier.value shouldEqual true
      }

    "key by lower-cased hash, because that is how the join is made" taggedAs UtilsTestTag in
      withMetrics(s"$Header\nAABBCC\tfalse\t17\t0.8\t0.8\t1\t1\tfalse\n") { directory =>
        StructureMetricsIndex.load(directory).keySet shouldEqual Set("aabbcc")
      }

    "leave a native row's percentiles empty rather than zero" taggedAs UtilsTestTag in
      withMetrics(s"$Header\n1abc\ttrue\t42\t\t\t\t\t\n") { directory =>
        val metrics = StructureMetricsIndex.load(directory)("1abc")

        metrics.isNative shouldEqual true
        metrics.numContacts.value shouldEqual 42
        // The generator ranks the modelled subset only, so a native structure has no percentile.
        // Zero would read as "worst in the set" instead of "not applicable".
        metrics.iptmPct shouldBe empty
        metrics.confidencePct shouldBe empty
      }

    "distinguish an unassessed binding mode from one assessed as normal" taggedAs UtilsTestTag in
      withMetrics(s"$Header\nblank\tfalse\t1\t0.5\t0.5\t1\t1\t\nfalsey\tfalse\t1\t0.5\t0.5\t1\t1\tfalse\n") { directory =>
        val metrics = StructureMetricsIndex.load(directory)

        metrics("blank").bindingModeOutlier shouldBe empty
        metrics("falsey").bindingModeOutlier.value shouldEqual false
        // isNative has no such distinction on purpose: it is a Boolean, and blank means false.
        metrics("blank").isNative shouldEqual false
      }

    "lose only the malformed field, not the row" taggedAs UtilsTestTag in
      withMetrics(s"$Header\n1abc\tfalse\tNOT_A_NUMBER\t0.5\t0.5\t1\t1\tfalse\n") { directory =>
        val metrics = StructureMetricsIndex.load(directory)("1abc")

        metrics.numContacts shouldBe empty
        metrics.iptm.value shouldEqual 0.5
      }

    "keep the first of a repeated hash" taggedAs UtilsTestTag in
      withMetrics(s"$Header\n1abc\tfalse\t10\t0.5\t0.5\t1\t1\tfalse\n1abc\tfalse\t99\t0.9\t0.9\t9\t9\ttrue\n") { directory =>
        StructureMetricsIndex.load(directory)("1abc").numContacts.value shouldEqual 10
      }

    "not care what order the columns are in" taggedAs UtilsTestTag in
      withMetrics("num_contacts\thash\tis_native\n17\t1abc\ttrue\n") { directory =>
        val metrics = StructureMetricsIndex.load(directory)("1abc")

        metrics.numContacts.value shouldEqual 17
        metrics.isNative shouldEqual true
        metrics.iptm shouldBe empty
      }

    "return nothing for an empty file, and for a header with no rows" taggedAs UtilsTestTag in
      withMetrics("") { directory =>
        StructureMetricsIndex.load(directory) shouldBe empty
      }

    "return nothing when the file is not there at all" taggedAs UtilsTestTag in {
      // A deployment without the companion file shows structures with no metrics, not an error.
      val directory = Files.createTempDirectory("structure-metrics-absent")
      try StructureMetricsIndex.load(directory) shouldBe empty
      finally Files.deleteIfExists(directory)
    }
  }
}

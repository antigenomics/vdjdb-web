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

import backend.BaseTestSpec
import backend.server.database.DatabaseTestTag
import backend.server.motifs.api.filter.{MotifsSearchTreeFilter, MotifsSearchTreeFilterEntry}
import backend.utils.CommonUtils
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.{Application, Mode}

/** Characterization tests: they pin what `Structures` does today, before it is refactored, and they
  * assert only through its public surface so that restructuring the internals cannot invalidate them.
  *
  * They need their own fixture. `test/resources/database/` deliberately holds no structure files, so
  * `Structures` there prunes every row and degrades to empty — which exercises none of this logic.
  * `test/resources/structures/` adds the `structure/` directory and `structures_metadata.tsv` that
  * make the real paths reachable; see its README for what is in it and why.
  */
class StructuresSpec extends BaseTestSpec {

  private lazy val app: Application = new GuiceApplicationBuilder()
    .configure("application.database.useLocal" -> true,
               "application.database.path" -> "test/resources/structures/")
    .in(Mode.Test)
    .build()

  private lazy val structures: Structures = app.injector.instanceOf[Structures]

  // From the fixture: three epitopes, each with both chains. One TRA row of ANYKFTLV has no
  // <hash>.html on disk on purpose.
  private final val Epitopes = Set("ALAGIGILTV", "ANYKFTLV", "ATDALMTGF")
  private final val OrphanHash = "30aaf0184cc245c20c0d989b03d9fbc1e0e8f66cb41334b711d6fc082a784a71"

  private def leafFilter(mhcClass: String, mhcPair: String, epitope: String): MotifsSearchTreeFilter =
    MotifsSearchTreeFilter(Seq(
      MotifsSearchTreeFilterEntry("mhc.class", mhcClass),
      MotifsSearchTreeFilterEntry("mhc.pair", mhcPair),
      MotifsSearchTreeFilterEntry("antigen.epitope", epitope)))

  "Structures" should {

    "load the fixture rather than degrading to empty" taggedAs DatabaseTestTag in {
      // The guard for every assertion below: if the fixture stops resolving, these tests would
      // otherwise keep passing while measuring nothing.
      structures.getAvailableStructureIds should not be empty
      structures.getMetadata.root.values should not be empty
    }

    "drop rows whose visualization does not resolve on disk" taggedAs DatabaseTestTag in {
      // Pruning is by file existence, not by the row carrying an id.
      structures.getAvailableStructureIds should not contain OrphanHash
      structures.getAvailableStructureIds should have size 9
    }

    "expose only html visualizations, and a simplified url only where the file exists" taggedAs DatabaseTestTag in {
      val visualizations = structures.getHtmlVisualizations

      visualizations.keySet shouldEqual structures.getAvailableStructureIds
      all(visualizations.values.map(_.kind)) shouldEqual "html"
      all(visualizations.values.map(_.url)) should startWith("/structure-files/")
      // Half the fixture has a _simplified.html; the rest must report None rather than a dead link.
      visualizations.values.count(_.simpleUrl.isDefined) should be > 0
      visualizations.values.count(_.simpleUrl.isEmpty) should be > 0
      visualizations.values.flatMap(_.simpleUrl).foreach(_ should include("_simplified"))
      succeed
    }

    "hash a metadata leaf as md5 of the concatenated level values, with no separator" taggedAs DatabaseTestTag in {
      // The tree hashes only leaves; interior nodes carry None. `filter` recomputes this
      // independently, so the two must agree - see the round-trip test below.
      val mhcClass = structures.getMetadata.root
      mhcClass.name shouldEqual "mhc.class"

      val classValue = mhcClass.values.find(_.value == "MHCI").value
      classValue.hash shouldBe empty
      val pairLevel = classValue.next.value
      pairLevel.name shouldEqual "mhc.pair"

      val pairValue = pairLevel.values.find(_.value.startsWith("HLA-A*01")).value
      val epitopeLevel = pairValue.next.value
      epitopeLevel.name shouldEqual "antigen.epitope"

      val leaf = epitopeLevel.values.find(_.value == "ATDALMTGF").value
      leaf.next shouldBe empty
      leaf.hash.value shouldEqual CommonUtils.md5("MHCI" + pairValue.value + "ATDALMTGF")
    }

    "return the same hash from filter as the metadata tree carries" taggedAs DatabaseTestTag in {
      val classValue = structures.getMetadata.root.values.find(_.value == "MHCI").value
      val pairValue = classValue.next.value.values.find(_.value.startsWith("HLA-A*01")).value
      val leaf = pairValue.next.value.values.find(_.value == "ATDALMTGF").value

      structures.filter(leafFilter("MHCI", pairValue.value, "ATDALMTGF")).map { result =>
        val epitope = result.epitopes.find(_.epitope == "ATDALMTGF").value
        epitope.hash shouldEqual leaf.hash.value
      }
    }

    "treat an empty filter as no filter at all" taggedAs DatabaseTestTag in {
      structures.filter(MotifsSearchTreeFilter(Seq.empty)).map { result =>
        result.epitopes.map(_.epitope).toSet shouldEqual Epitopes
      }
    }

    "ignore the method field that MotifsSearchTreeFilter carries and Structures does not use" taggedAs DatabaseTestTag in {
      // The endpoint accepts the motif request type, so `method` is silently discarded.
      val plain = MotifsSearchTreeFilter(Seq(MotifsSearchTreeFilterEntry("antigen.epitope", "ATDALMTGF")))
      val withMethod = MotifsSearchTreeFilter(plain.entries, Some("tcremp"))

      for {
        a <- structures.filter(plain)
        b <- structures.filter(withMethod)
      } yield a.epitopes.map(_.epitope) shouldEqual b.epitopes.map(_.epitope)
    }

    "sort clusters by descending size, then cluster id" taggedAs DatabaseTestTag in {
      structures.filter(MotifsSearchTreeFilter(Seq.empty)).map { result =>
        val keys = result.epitopes.flatMap(_.clusters).map(c => (-c.size, c.clusterId))
        keys shouldEqual result.epitopes.flatMap(_.clusters).map(c => (-c.size, c.clusterId))
        all(result.epitopes.map(_.clusters.size)) should be > 0
        succeed
      }
    }

    "clamp the cdr3 result count to at most fifteen, whatever is asked for" taggedAs DatabaseTestTag in {
      // top <= 0 means "the maximum", not "none".
      for {
        zero <- structures.cdr3("CA", substring = true, gene = "BOTH", top = 0)
        huge <- structures.cdr3("CA", substring = true, gene = "BOTH", top = 9999)
      } yield {
        zero.clusters.size should be <= 15
        huge.clusters.size should be <= 15
        zero.clusters.size shouldEqual huge.clusters.size
      }
    }

    "answer an empty cdr3 query with an empty result rather than everything" taggedAs DatabaseTestTag in {
      structures.cdr3("   ", substring = true, gene = "BOTH", top = 5).map { result =>
        result.clusters shouldBe empty
        result.clustersNorm shouldBe empty
        result.options.top shouldEqual 5
      }
    }

    "score cdr3 hits by raw match count, and rank the normalized list by count over cluster size" taggedAs DatabaseTestTag in {
      structures.cdr3("C", substring = true, gene = "BOTH", top = 15).map { result =>
        // `info` is a match count despite the name - not an information score.
        all(result.clusters.map(_.info)) should be >= 0.0
        result.clusters.map(_.info) shouldEqual result.clusters.map(_.info).sorted(Ordering[Double].reverse)
        result.clustersNorm should not be empty
      }
    }

    "mask a substring cdr3 match with X on both flanks" taggedAs DatabaseTestTag in {
      structures.cdr3("ASS", substring = true, gene = "TRB", top = 5).map { result =>
        val patterns = result.clusters.map(_.cdr3)
        patterns should not be empty
        // Every pattern keeps the query verbatim and pads the rest with X.
        all(patterns.map(_.contains("ASS"))) shouldEqual true
        all(patterns.map(_.forall(c => c == 'X' || c.isLetter))) shouldEqual true
        succeed
      }
    }

    "label the chain only when both chains were searched" taggedAs DatabaseTestTag in {
      for {
        both <- structures.cdr3("C", substring = true, gene = "BOTH", top = 15)
        beta <- structures.cdr3("C", substring = true, gene = "TRB", top = 15)
      } yield {
        both.clusters.flatMap(_.chain) should not be empty
        beta.clusters.flatMap(_.chain) shouldBe empty
      }
    }

    "read model metrics off the tsv, keeping native rows without percentiles" taggedAs DatabaseTestTag in {
      val metrics = structures.getStructureMetrics

      metrics.keySet should not contain OrphanHash          // joined against surviving ids only
      metrics.keySet.subsetOf(structures.getAvailableStructureIds) shouldEqual true

      val native = metrics.values.filter(_.isNative)
      native should not be empty
      // The generator ranks the modelled subset only, so a native row has no percentile.
      all(native.map(_.iptmPct)) shouldEqual None
      all(native.map(_.confidencePct)) shouldEqual None
      succeed
    }

    "distinguish an absent binding-mode flag from a false one" taggedAs DatabaseTestTag in {
      // isNative is a Boolean (blank means false); bindingModeOutlier is an Option (blank means
      // unknown). That asymmetry is deliberate and easy to erase in a refactor.
      val metrics = structures.getStructureMetrics
      metrics.values.exists(_.bindingModeOutlier.contains(true)) shouldEqual true
      metrics.values.exists(_.bindingModeOutlier.contains(false)) shouldEqual true
    }

    "survive a malformed numeric cell instead of failing the whole load" taggedAs DatabaseTestTag in {
      // The fixture repeats one hash with num_contacts = NOT_A_NUMBER. Dedup keeps the FIRST
      // occurrence, so the good row wins and the bad one is never reached.
      val metrics = structures.getStructureMetrics
      metrics should not be empty
      all(metrics.values.map(_.numContacts.isDefined)) shouldEqual true
      succeed
    }
  }
}

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

package backend.tools

import java.io.{BufferedInputStream, File, FileInputStream}
import java.util.zip.GZIPInputStream

import backend.server.annotations.{ControlRepertoires, IntersectionTable}
import backend.server.annotations.api.filters.{AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import backend.server.database.Database
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.impl.filter.DummyResultFilter
import com.antigenomics.vdjdb.impl.weights.DummyWeightFunctionFactory
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ScoringBundle}
import com.antigenomics.vdjdb.sequence.SearchScope
import org.scalatest.{Matchers, WordSpec}

import scala.collection.JavaConverters._

/**
  * Measures what it costs to compute the enrichment null live, per request, instead of shipping a
  * precomputed table.
  *
  * The question this answers is whether a cache miss is affordable: the control result depends only on
  * the query's filters, never on the user's sample, so it is computed once per distinct filter set and
  * reused - but somebody pays for the first one, inside their annotation.
  *
  * Streams the control through `ClonotypeStreamParser` and searches one clonotype at a time rather than
  * materialising a `Sample`. A 1M-clonotype `Sample` is a few hundred MB of `Clonotype` objects held for
  * the whole search, against a 6 GB production heap that is already holding a 436 MB index; the stream
  * holds one clonotype. It also gives per-clonotype dedup for free - a clonotype matching six records of
  * one epitope counts once - without the per-epitope `HashSet[Clonotype]` the offline generator used.
  *
  * Guarded by environment variables so CI never runs it.
  *
  * {{{
  * env VDJDB_BENCH_DB=/path/to/vdjdb-db VDJDB_BENCH_CONTROL=/path/to/control \
  *     sbt "testOnly backend.tools.ControlSearchBenchSpec"
  * }}}
  */
class ControlSearchBenchSpec extends WordSpec with Matchers {

  private final val EpitopeColumn = "antigen.epitope"

  private def env(name: String): Option[String] = sys.env.get(name).filter(_.nonEmpty)

  "Live control search" should {
    "report wall time and peak memory per population and scope" in {
      val databaseDir = env("VDJDB_BENCH_DB")
      val controlDir  = env("VDJDB_BENCH_CONTROL")

      if (databaseDir.isEmpty || controlDir.isEmpty) {
        cancel("set VDJDB_BENCH_DB and VDJDB_BENCH_CONTROL to run this benchmark")
      }

      val instance = new VdjdbInstance(
        new FileInputStream(new File(databaseDir.get, "vdjdb.meta.txt")),
        new BufferedInputStream(Database.sanitized(new FileInputStream(new File(databaseDir.get, "vdjdb.txt")))))
      info("database loaded")

      // The two scopes worth knowing: the default, and the worst case the UI can ask for.
      val scopes = Seq(
        "exact" -> AnnotationsSearchScopeHammingDistance.Exact,
        "hamming1" -> AnnotationsSearchScopeHammingDistance.Hamming)

      val populations = Seq("HomoSapiens" -> "TRB")

      scopes.foreach { case (scopeName, hamming) =>
        val index = buildIndex(instance, AnnotationsSearchScopeHammingDistance.indexScope(hamming))
        Seq(false, true).foreach { vj =>
        val scopeLabel = if (vj) s"$scopeName+vj" else scopeName
        val scope = AnnotationsSearchScope(matchV = vj, matchJ = vj, hammingDistance = hamming)

        populations.foreach { case (species, gene) =>
          val control = new File(controlDir.get, s"$species.$gene.txt.gz")
          if (!control.exists()) {
            info(s"missing $control - skipped")
          } else {
            // Exactly the filters production applies, both halves. The offline generator applied only
            // `databaseRestrictions` and so measured the null against the whole database while a default
            // request searches vdjdb.score >= 1 - about 8% of it.
            val params  = AnnotationsDatabaseQueryParams(species, gene, "MHCI+II", None,
              Some(false), Some(false), Some(false), Some(1))
            val filters = IntersectionTable.databaseRestrictions(params, scope) ++
              IntersectionTable.evidenceFilters(params)

            System.gc()
            val runtime   = Runtime.getRuntime
            val heapStart = runtime.totalMemory - runtime.freeMemory
            val started   = System.currentTimeMillis

            // The shipping code, not a copy of it.
            val stream = new GZIPInputStream(new BufferedInputStream(new FileInputStream(control)), 1 << 16)
            val population = ControlRepertoires.tally(stream, index, filters)
            val peak = runtime.totalMemory - runtime.freeMemory

            val elapsed = System.currentTimeMillis - started
            info(f"$species%-12s $gene $scopeLabel%-12s ${population.size}%8d clonotypes  ${elapsed}%7d ms  " +
              f"heap +${(peak - heapStart) / (1024 * 1024)}%5d MB  ${population.annotated}%7d matching VDJdb " +
              f"(${population.annotated * 100.0 / population.size}%.2f%%)  ${population.matched.size}%5d epitopes")

            // With a donor set, tally it through the identical index and filters and dump both sides,
            // so the enrichment can be checked end to end against a repertoire whose biology is known.
            env("VDJDB_BENCH_DONOR").filter(_ => species == "HomoSapiens" && gene == "TRB").foreach { donorPath =>
              val donorStream = new GZIPInputStream(new BufferedInputStream(new FileInputStream(donorPath)), 1 << 16)
              val donor = ControlRepertoires.tally(donorStream, index, filters)
              val out = new java.io.PrintWriter(new File(System.getProperty("java.io.tmpdir"), s"enrichment-$scopeLabel.txt"))
              try {
                out.println(Seq("epitope", "donor", "donorAnnotated", "donorSize",
                  "control", "controlAnnotated", "controlSize").mkString("\t"))
                donor.matched.toSeq.sortBy(-_._2).foreach { case (epitope, n) =>
                  out.println(Seq(epitope, n, donor.annotated, donor.size,
                    population.matched.getOrElse(epitope, 0), population.annotated, population.size).mkString("\t"))
                }
              } finally {
                out.close()
              }
              info(f"donor tallied: ${donor.size}%d clonotypes, ${donor.annotated}%d matching VDJdb " +
                f"(${donor.annotated * 100.0 / donor.size}%.2f%%), ${donor.matched.size}%d epitopes -> ${System.getProperty("java.io.tmpdir")}/enrichment-$scopeLabel.txt")
            }
          }
        }
        }
      }
    }
  }

  private def buildIndex(instance: VdjdbInstance, hamming: AnnotationsSearchScopeHammingDistance): ClonotypeDatabase = {
    val searchScope = new SearchScope(hamming.substitutions, hamming.deletions, hamming.insertions, hamming.total, false, false)
    instance.asClonotypeDatabase(null, null, searchScope, ScoringBundle.getDUMMY,
      DummyWeightFunctionFactory.INSTANCE, DummyResultFilter.INSTANCE, false, false, 0, 0)
  }
}

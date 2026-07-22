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

import java.io.{BufferedInputStream, File, FileInputStream, PrintWriter}

import backend.server.annotations.IntersectionTable
import backend.server.annotations.api.filters.{AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import backend.server.database.Database
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.impl.filter.DummyResultFilter
import com.antigenomics.vdjdb.impl.weights.DummyWeightFunctionFactory
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ScoringBundle}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import com.antigenomics.vdjtools.sample.Clonotype
import org.scalatest.{Matchers, WordSpec}

import scala.collection.JavaConverters._
import scala.collection.mutable

/**
  * Generates the control-derived Beta prior behind the enrichment p-values.
  *
  * For every epitope: how many clonotypes of a healthy repertoire match it by chance. That count
  * replaces the epitope's share of database records as the null rate, because a record count says
  * nothing about how *reachable* an epitope is. Measured on production, the record-count null gives
  * a synthetic control repertoire the same epitope profile as two real donors - it scores the shape
  * of the database, not the sample.
  *
  * Not a test: a tool, kept as a spec so it runs through sbt without a second entry point, and
  * cancelled unless its three environment variables are set so CI never touches it. It needs a
  * 200 MB database and four 100k control repertoires, neither of which belongs in this repository.
  *
  * {{{
  * env VDJDB_PRIOR_DB=/path/to/vdjdb-db/ \
  *     VDJDB_PRIOR_CONTROL=/path/to/control/ \
  *     VDJDB_PRIOR_OUT=conf/control-prior.txt \
  *     sbt "testOnly backend.tools.ControlPriorGeneratorSpec"
  * }}}
  *
  * `VDJDB_PRIOR_CONTROL` holds `<species>.<gene>.txt`, VDJtools format, one per population, each
  * already cut to `ControlSize` clonotypes and to productive rearrangements only. That filtering is
  * not cosmetic: mouse TRA runs 21% stop-codon and frameshift reads at the top of its count
  * distribution, and those can never match a database of productive CDR3s, so leaving them in
  * dilutes the denominator and returns a rate that is too low - a prior too permissive exactly where
  * the data is thinnest.
  *
  * The output is scope-indexed. Reachability is a property of the search radius, so a prior measured
  * at Hamming 1 is simply wrong at Hamming 2, and every edit distance the UI offers gets its own rows.
  */
class ControlPriorGeneratorSpec extends WordSpec with Matchers {

  private final val ControlSize = 100000

  /** The edit distances the UI offers, each under the name `ControlPrior` will look it up by. */
  private final val Scopes: Seq[AnnotationsSearchScopeHammingDistance] =
    AnnotationsSearchScopeHammingDistance.Offered

  private final val Populations: Seq[(String, String)] = Seq(
    "HomoSapiens" -> "TRA", "HomoSapiens" -> "TRB",
    "MusMusculus" -> "TRA", "MusMusculus" -> "TRB"
  )

  private def env(name: String): Option[String] = sys.env.get(name).filter(_.nonEmpty)

  "ControlPriorGenerator" should {
    "tabulate control match counts per epitope" in {
      val databaseDir = env("VDJDB_PRIOR_DB")
      val controlDir = env("VDJDB_PRIOR_CONTROL")
      val outPath = env("VDJDB_PRIOR_OUT")

      if (databaseDir.isEmpty || controlDir.isEmpty || outPath.isEmpty) {
        cancel("set VDJDB_PRIOR_DB, VDJDB_PRIOR_CONTROL and VDJDB_PRIOR_OUT to generate the prior")
      }

      // Through the same sanitizer production loads with. The database has short lines that have to be
      // padded to the header's column count before the engine will parse them; a tool that skipped it
      // would be describing a database the server never sees.
      val instance = new VdjdbInstance(
        new FileInputStream(new File(databaseDir.get, "vdjdb.meta.txt")),
        new BufferedInputStream(Database.sanitized(new FileInputStream(new File(databaseDir.get, "vdjdb.txt")))))
      info("database loaded")

      val writer = new PrintWriter(new File(outPath.get))
      try {
        writer.println(Seq("species", "gene", "scope", "epitope", "matched", "control").mkString("\t"))

        Scopes.foreach { hamming =>
          val scopeName = AnnotationsSearchScopeHammingDistance.priorName(hamming)
          val index = buildIndex(instance, hamming)
          val scope = AnnotationsSearchScope(matchV = false, matchJ = false, hammingDistance = hamming)

          Populations.foreach { case (species, gene) =>
            val control = new File(controlDir.get, s"$species.$gene.txt")
            if (!control.exists()) {
              info(s"missing control repertoire $control - skipped")
            } else {
              val started = System.currentTimeMillis
              val sample = new SampleFileConnection(control.getAbsolutePath, Software.VDJtools).getSample

              // The defaults the UI sends: both MHC classes, assay confidence >= 1, no motif or HLA
              // narrowing. A prior has to be measured under the query it will be used to score.
              val params = AnnotationsDatabaseQueryParams(species, gene, "MHCI+II", None,
                Some(false), Some(false), Some(false), Some(1))
              val filters = IntersectionTable.databaseRestrictions(params, scope)

              // Deduplicated by clonotype the way the summary counters are: one clonotype matching six
              // records of the same epitope is one hit against that epitope, not six.
              val perEpitope = mutable.HashMap.empty[String, mutable.HashSet[Clonotype]]
              index.search(sample).asScala.foreach { case (clonotype, hits) =>
                hits.asScala.filter(hit => filters.forall(allows => allows(clonotype, hit))).foreach { hit =>
                  val epitope = hit.getRow.getAt("antigen.epitope").getValue
                  val _ = perEpitope.getOrElseUpdate(epitope, mutable.HashSet.empty[Clonotype]) += clonotype
                }
              }

              perEpitope.toSeq.sortBy(-_._2.size).foreach { case (epitope, clonotypes) =>
                writer.println(Seq(species, gene, scopeName, epitope, clonotypes.size, ControlSize).mkString("\t"))
              }
              info(f"$species%-12s $gene $scopeName%-13s ${perEpitope.size}%5d epitopes reached in " +
                f"${System.currentTimeMillis - started}%6d ms")
            }
          }
        }
      } finally {
        writer.close()
      }
    }
  }

  /** Built exactly as `IntersectionTable.buildSearchIndex` builds it - no species or gene baked into
    * the index, since both are post-search predicates now. A prior measured through a different index
    * would be describing a different search from the one it is used to score.
    *
    * Through `indexScope`, so the exact scope rides the one-substitution index and is narrowed back
    * afterwards by the `withinScope` predicate inside `databaseRestrictions` - which is what production
    * does, and the reason it does it is that a zero-budget `SearchScope` is a construction nothing in
    * this codebase has ever performed against the engine. Measuring the null through one and scoring
    * requests through the other would be comparing two searches, not one. */
  private def buildIndex(instance: VdjdbInstance, requested: AnnotationsSearchScopeHammingDistance): ClonotypeDatabase = {
    val hamming = AnnotationsSearchScopeHammingDistance.indexScope(requested)
    val searchScope = new SearchScope(hamming.substitutions, hamming.deletions, hamming.insertions, hamming.total, false, false)
    instance.asClonotypeDatabase(null, null, searchScope, ScoringBundle.getDUMMY,
      DummyWeightFunctionFactory.INSTANCE, DummyResultFilter.INSTANCE, false, false, 0, 0)
  }
}

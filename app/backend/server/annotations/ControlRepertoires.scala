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

import java.io.{BufferedInputStream, File, FileInputStream, InputStream}
import java.util.zip.GZIPInputStream

import backend.server.annotations.api.filters.{AnnotationsDatabaseQueryParams, AnnotationsSearchScope}
import backend.server.database.Database
import com.antigenomics.vdjdb.impl.ClonotypeDatabase
import com.antigenomics.vdjtools.io.parser.ClonotypeStreamParser
import com.antigenomics.vdjtools.misc.Software
import com.antigenomics.vdjtools.sample.Sample
import com.antigenomics.vdjtools.sample.metadata.MetadataUtil
import org.slf4j.LoggerFactory

import java.util.concurrent.ForkJoinPool

import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.collection.parallel.ForkJoinTaskSupport

/** How often a healthy repertoire reaches each epitope by chance — the null the enrichment p-values in
  * the annotation summary are read against.
  *
  * ==Why a control and not the database==
  *
  * The intuitive null is an epitope's share of VDJdb records, and it measures the database rather than
  * the donor. Record count barely tracks reachability: `YLEPGPVTA` holds 11 human TRB records and a
  * random repertoire reaches it far more often than `EPLPQGQLTAY`, which holds 39. Scored that way, the
  * synthetic `mixed.airr` demo sample — which has no immunological history whatsoever — came out with
  * the same epitope profile as two real donors, to within a couple of percent.
  *
  * ==Why it is measured here and not shipped as a table==
  *
  * This replaces a precomputed `control-prior.txt`, and the reason is not convenience. That table was
  * generated offline by code that narrowed the database with `IntersectionTable.databaseRestrictions`
  * alone — and confidence is deliberately *not* one of those, it lives in
  * [[IntersectionTable.evidenceFilters]]. So the null was measured against the whole database while
  * every default request searches `vdjdb.score >= 1`, which is 7.9% of distinct human TRB CDR3s. The
  * table was complete, plausible and wrong, and nothing anywhere could have reported it.
  *
  * Searching the control here, through the index the request is already using and the filter list the
  * request has already built, makes that class of drift impossible rather than merely fixed: there is
  * one filter list and both the sample and the control pass through it. It also removes the table's
  * other liability — it described whatever database it was generated against, and nothing checked that
  * against the database actually loaded, so a VDJdb refresh silently invalidated it.
  *
  * ==Cost==
  *
  * The result depends on the query's filters and never on the user's sample, so it is computed once per
  * distinct filter set and shared by every annotation afterwards. Somebody pays for the first one inside
  * their own annotation; everyone after that pays nothing.
  *
  * Clonotypes are streamed and searched one at a time rather than loaded into a `Sample`. A 1M-clonotype
  * `Sample` is a few hundred MB of live `Clonotype` objects against a 6 GB production heap that already
  * holds a 436 MB search index. Streaming holds one clonotype, and gives the per-clonotype deduplication
  * for free: a clonotype matching six records that share an epitope counts once for that epitope, which
  * is what the summary counters do.
  */
object ControlRepertoires {

  private final val logger = LoggerFactory.getLogger(this.getClass)

  private final val EpitopeColumn = "antigen.epitope"

  private final val Directory = "control"

  /** Clonotypes searched per parallel batch. Only one batch is live at a time, so this is the memory
    * knob; large enough that the fork-join overhead disappears against a search, small enough that the
    * batch is noise beside the index it is being searched through. */
  private final val BatchSize = 20000

  /** One core left for everything else. The engine's own `search(Sample)` takes every processor it can
    * see, per job, which is what `AnnotationsScheduler` exists to bound; this is the same shape and the
    * same ceiling, and it runs inside a scheduler slot that has already been granted. */
  private final val Parallelism: Int = math.max(1, Runtime.getRuntime.availableProcessors - 1)

  /** Jeffreys. Half a count on each side of the Beta.
    *
    * This is what keeps the rare tail honest in both directions. An epitope the control never reached
    * has no maximum-likelihood rate other than exactly zero, under which a single match in a donor is
    * infinitely surprising and every unreached epitope leads the chart. The half-count instead says
    * "somewhere below one in `size`", which is what the measurement supports. It also means an epitope
    * missing from the counts needs no special case — [[Population.betaFor]] hands back the same floor.
    */
  private final val Pseudocount: Double = 0.5

  /** Distinct control clonotypes reaching each epitope, how many reached anything at all, and how many
    * were searched to find out.
    *
    * @param annotated clonotypes matching at least one record. This, not `size`, is the denominator the
    *                  rate is taken over — see [[Population.betaFor]].
    */
  final case class Population(matched: Map[String, Int], annotated: Long, size: Long) {

    /** The Beta on "given that a clonotype matches VDJdb at all, is it this epitope".
      *
      * Conditioning on having matched is what makes the test comparable across repertoires, and it is
      * not a refinement — without it the answer is dominated by how public the two repertoires are
      * rather than by what they respond to. Measured on the CMV+ demo sample against a uniform draw of
      * the pooled control, *every* epitope came out enriched by about the same 9x, because the sample
      * matches VDJdb at 9.21% and the control at 1.00%. Two reasons, neither of them biology: the
      * control is amino-acid collapsed while an uploaded sample is nucleotide-level, and convergent
      * recombination concentrates on exactly the public sequences VDJdb holds (1.63x for matching
      * sequences against 1.04x overall); and the control is 62% singletons where the sample has none,
      * so it is systematically more private than anything a user uploads.
      *
      * Both are differences in how the two repertoires were built, and both divide out here. What
      * remains is composition: of the clonotypes that matched, what share went to this epitope.
      */
    def betaFor(epitope: String): (Double, Double) = {
      val hits = matched.getOrElse(epitope, 0)
      (hits + Pseudocount, math.max(0L, annotated - hits) + Pseudocount)
    }
  }

  /** Everything the answer depends on. `filters` is derived from these two, so keying on them alone is
    * complete — see the caveat on [[betaFor]]. */
  private final case class Key(parameters: AnnotationsDatabaseQueryParams, scope: AnnotationsSearchScope)

  private val cache = mutable.LinkedHashMap.empty[Key, Option[Population]]

  /** Bounded because the HLA field is free text, so a client can mint new keys indefinitely. Eviction is
    * oldest-first and the entries are small (a few thousand counts); the cap exists to stop the map
    * growing without limit, not to manage memory pressure. The expensive resource is the search behind a
    * miss, and that is already bounded by `AnnotationsScheduler` and the per-user daily quota. */
  private final val MaxCachedPopulations = 32

  /** `epitope -> (alpha, beta)` for this request, or `_ => None` when there is no control to measure
    * against — an unsupported species or chain, or a missing control file. The client renders no p-value
    * in that case rather than one computed against a substitute.
    *
    * @param index   the same search index the sample is being searched through. Passing it rather than
    *                rebuilding guarantees the control walks the same CDR3 tree at the same scope.
    * @param filters the same hit filters the sample's results are being narrowed by, built once by the
    *                caller and handed to both. This is the whole point: the null and the observation are
    *                filtered identically by construction, not by two pieces of code agreeing.
    */
  def betaFor(database: Database, index: ClonotypeDatabase, parameters: AnnotationsDatabaseQueryParams,
              scope: AnnotationsSearchScope,
              filters: Seq[IntersectionTable.HitFilter]): String => Option[(Double, Double)] = {
    val key = Key(parameters, scope)

    val cached = synchronized(cache.get(key))
    val population = cached.getOrElse {
      // Computed outside the lock. Two requests racing on the same key both search, which wastes one
      // search; holding the lock across a multi-second search would instead stall every other
      // annotation, including the ones that would have hit the cache.
      val computed = measure(database, index, parameters, filters)
      synchronized {
        cache.put(key, computed)
        while (cache.size > MaxCachedPopulations) {
          cache.remove(cache.head._1)
        }
      }
      computed
    }

    population match {
      case Some(counts) => (epitope: String) => Some(counts.betaFor(epitope))
      case None         => _ => None
    }
  }

  private def measure(database: Database, index: ClonotypeDatabase,
                      parameters: AnnotationsDatabaseQueryParams,
                      filters: Seq[IntersectionTable.HitFilter]): Option[Population] =
    open(database, parameters.species, parameters.gene).map { case (origin, stream) =>
      val started    = System.currentTimeMillis
      val population = tally(stream, index, filters)
      logger.info(s"Control null measured from $origin: ${population.size} clonotypes, " +
        s"${population.annotated} matching VDJdb, ${population.matched.size} epitopes reached, " +
        s"${System.currentTimeMillis - started} ms")
      population
    }

  /** How many clonotypes of one control stream reach each epitope, under `filters`.
    *
    * Batched rather than one clonotype at a time, because the engine's own `search(Sample)` is
    * parallel and a sequential walk gives that up: measured on a 1M-clonotype human TRB control, one
    * substitution took 17.1 s sequentially. The batch is small enough that only it is ever live, so
    * this keeps the streaming memory profile while getting the cores back.
    *
    * Each worker accumulates into its own map and the maps are merged at the end — the alternative,
    * one shared concurrent map, would contend on exactly the hottest keys, since the epitopes worth
    * counting are the ones nearly every batch hits.
    *
    * `private[backend]` for the benchmark in `test/backend/tools`, so that measures this code rather
    * than a copy of it that can drift.
    */
  private[backend] def tally(stream: InputStream, index: ClonotypeDatabase,
                             filters: Seq[IntersectionTable.HitFilter]): Population = {
    val counts    = mutable.HashMap.empty[String, Int]
    var size      = 0L
    var annotated = 0L

    val pool = new ForkJoinTaskSupport(new ForkJoinPool(Parallelism))
    try {
      val parser = ClonotypeStreamParser.create(stream, Software.VDJtools, blankSample)
      parser.iterator().asScala.grouped(BatchSize).foreach { batch =>
        size += batch.size
        val batched = batch.par
        batched.tasksupport = pool
        val partials = batched.map { clonotype =>
          val local = mutable.HashMap.empty[String, Int]
          val hits  = index.search(clonotype).asScala.filter(hit => filters.forall(allows => allows(clonotype, hit)))
          if (hits.nonEmpty) {
            // Distinct epitopes for this one clonotype, then one increment each - the deduplication the
            // summary counters do, without retaining a clonotype anywhere.
            hits.map(_.getRow.getAt(EpitopeColumn).getValue).toSet[String].foreach { epitope =>
              local(epitope) = local.getOrElse(epitope, 0) + 1
            }
          }
          (local, if (hits.nonEmpty) 1 else 0)
        }
        partials.seq.foreach { case (local, matchedAnything) =>
          annotated += matchedAnything
          local.foreach { case (epitope, n) => counts(epitope) = counts.getOrElse(epitope, 0) + n }
        }
      }
    } finally {
      try stream.close() catch { case _: Exception => }
      pool.environment.shutdown()
    }

    // Counted while streaming rather than taken from the file, so a row the parser rejects is not in
    // the denominator - the rate has to be per clonotype actually searched.
    Population(counts.toMap, annotated, size)
  }

  /** Beside the database first, then the packaged copy.
    *
    * The database is a bind mount updated independently of the image, so a deployment that wants a
    * different control set can drop one next to it; the copy in `conf/` is what the image was built
    * with. Unlike the table this replaces, neither goes stale on a database refresh — the counts are
    * derived at request time from whatever database is loaded.
    */
  private def open(database: Database, species: String, gene: String): Option[(String, InputStream)] = {
    if (species.isEmpty || gene.isEmpty) {
      None
    } else {
      val name   = s"$species.$gene.txt.gz"
      val beside = new File(new File(database.getLocation, Directory), name)
      val source: Option[(String, InputStream)] =
        if (beside.isFile) {
          Some(beside.getAbsolutePath -> new FileInputStream(beside))
        } else {
          Option(getClass.getResourceAsStream(s"/$Directory/$name")).map(s => s"classpath:/$Directory/$name" -> s)
        }
      if (source.isEmpty) {
        logger.warn(s"No control repertoire $name beside the database or on the classpath - " +
          "enrichment p-values are disabled for this species and chain")
      }
      source.map { case (origin, raw) => origin -> new GZIPInputStream(new BufferedInputStream(raw), 1 << 16) }
    }
  }

  /** The parser attaches every clonotype it builds to a parent sample. Nothing here reads back through
    * it — the counts are of clonotypes, and frequencies never enter — so an empty one is enough. */
  private def blankSample: Sample = new Sample(MetadataUtil.createSampleMetadata("control"))
}

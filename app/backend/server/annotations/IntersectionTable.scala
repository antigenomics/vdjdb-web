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

import java.util

import backend.server.ResultsTable
import backend.server.annotations.api.annotate.SampleAnnotateRequest
import backend.server.annotations.api.filters.{AnnotationsAnnotateScoring, AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryCounters, SummaryFieldCounter}
import backend.server.database.Database
import com.antigenomics.vdjdb.impl.filter.{DummyResultFilter, MaxScoreResultFilter, TopNResultFilter}
import com.antigenomics.vdjdb.impl.weights.{DegreeWeightFunctionFactory, DummyWeightFunctionFactory}
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ClonotypeSearchResult, ScoringBundle, ScoringProvider}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjdb.stat.ClonotypeSearchSummary
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjtools.sample.{Clonotype, Sample}
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.math.Ordering.String

class IntersectionTable(var summary: Option[SummaryCounters] = None) extends ResultsTable[IntersectionTableRow] {

  def sort(columnIndex: Int, sortType: String): Unit = {
    if ((sortType == "desc" || sortType == "asc") && (columnIndex >= 0)) {
      rows = rows.sortWith((e1, e2) => {
        val v1 = e1.entries(columnIndex)
        val v2 = e2.entries(columnIndex)
        sortType match {
          case "desc" => String.gt(v1, v2)
          case "asc" => String.lt(v1, v2)
        }
      })
    }
  }

  def update(request: SampleAnnotateRequest, sample: Sample, database: Database): IntersectionTable = {
    val instance = IntersectionTable.createClonotypeDatabase(database, request.databaseQueryParams, request.searchScope, request.scoring)
    val donor    = HlaAllele.parseAll(request.databaseQueryParams.hla.getOrElse(""))

    val raw = instance.search(sample)
    val found = raw.asScala.toList
      .map { case (clonotype, hits) => (clonotype, hits.asScala.toList.filter(IntersectionTable.allowedForDonor(_, donor))) }
      .filter { case (_, hits) => hits.nonEmpty }
      .sortWith { case ((c1, _), (c2, _)) => c1.getFreq > c2.getFreq }

    this.rows = found.map(IntersectionTableRow.createFromSearchResult)

    // Summarize what the user is actually shown: with a donor typing set, the unmatched tally has to
    // grow by the clonotypes the HLA filter removed, which only happens if the summary sees the
    // filtered map.
    val summarized = if (donor.isEmpty) raw else found.map { case (clonotype, hits) => clonotype -> hits.asJava }.toMap.asJava
    val summary    = new ClonotypeSearchSummary(summarized, sample, ClonotypeSearchSummary.FIELDS_STARBURST, instance)
    val counters = summary.fieldCounters.asScala.map { case (name, map) =>
      SummaryFieldCounter(name, map.asScala.filter(v => v._2.getUnique != 0).map { case (field, value) =>
        SummaryClonotypeCounter(field, value.getUnique, value.getDatabaseUnique, value.getFrequency, value.getReads)
      }.toSeq)
    }.toSeq

    val nfc = summary.getNotFoundCounter
    this.summary = Some(SummaryCounters(
      counters :+ IntersectionTable.summarizeByHlaLocus(found),
      SummaryClonotypeCounter("notFound", nfc.getUnique, nfc.getDatabaseUnique, nfc.getFrequency, nfc.getReads),
      IntersectionTable.summarizeAnnotated(found)))

    this.currentPage = 0
    this
  }
}

object IntersectionTable {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  // MHC-I records carry the HLA in mhc.a and the invariant B2M in mhc.b; MHC-II records carry a real
  // allele in both. A donor matches on either, which no shipped TextFilter can express: filters are
  // bound one per column and ANDed, so an OR across two columns is only available here.
  private final val MhcColumns: Seq[String] = Seq("mhc.a", "mhc.b")

  private def allowedForDonor(hit: ClonotypeSearchResult, donor: Seq[HlaAllele]): Boolean =
    donor.isEmpty || MhcColumns.exists(column => HlaAllele.matches(hit.getRow.getAt(column).getValue, donor))

  /** Matches broken down by HLA locus.
    *
    * Not derivable on the client from the `mhc.a`/`mhc.b` counters the engine already produces: those
    * are per allele, so a clonotype matching both an `HLA-A*02` and an `HLA-A*02:01` record would be
    * counted twice under locus A. Accumulating here counts each clonotype once per locus.
    *
    * `databaseUnique` is left at 0 — a whole-database denominator per locus would need its own scan of
    * the database and is only used by one optional chart normalization.
    */
  private def summarizeByHlaLocus(found: Seq[(Clonotype, Seq[ClonotypeSearchResult])]): SummaryFieldCounter = {
    val counts = mutable.LinkedHashMap.empty[String, (Int, Double, Long)]
    found.foreach { case (clonotype, hits) =>
      val loci = hits.flatMap(hit => MhcColumns.flatMap(column => HlaAllele.loci(hit.getRow.getAt(column).getValue))).distinct
      loci.foreach { locus =>
        val (unique, frequency, reads) = counts.getOrElse(locus, (0, 0.0, 0L))
        counts(locus) = (unique + 1, frequency + clonotype.getFreq, reads + clonotype.getCount.toLong)
      }
    }
    SummaryFieldCounter("mhc.locus", counts.map {
      case (locus, (unique, frequency, reads)) => SummaryClonotypeCounter(locus, unique, 0L, frequency, reads)
    }.toSeq)
  }

  def summarizeAnnotated(found: Seq[(Clonotype, Seq[ClonotypeSearchResult])]): SummaryClonotypeCounter =
    SummaryClonotypeCounter("annotated", found.size,
      found.flatMap { case (_, hits) => hits.map(_.getRow) }.distinct.size.toLong,
      found.map { case (clonotype, _) => clonotype.getFreq }.sum,
      found.map { case (clonotype, _) => clonotype.getCount.toLong }.sum)

  /** How many built databases to keep. Each holds a materialized copy of the matching VDJdb rows plus
    * its CDR3 tree, so this stays deliberately small: in practice nearly every request arrives with the
    * default parameters and hits the same entry, and a second slot only has to cover one user running
    * a different species or gene alongside them.
    *
    * Kept small on purpose rather than sized against the heap — the app runs with no `-Xmx` at all, so
    * its ceiling is the JVM default of a quarter of host RAM (6.8 GB here) and would move if the host
    * or its other containers changed. The `Built clonotype database ... heap N MB` line logged below is
    * what to read before raising this. Note `.jvmopts` is sbt-only and does not reach the packaged app.
    */
  // Two, because the chain split makes TRA+TRB the normal working set: annotating both halves of a
  // split sample alternates gene=TRA and gene=TRB, and at size 1 each eviction guarantees the next
  // annotation misses — the cache would never hit for the workflow the splitter itself creates.
  //
  // This was briefly 1, on a heap figure that turned out to be unsound: sampling total-free around the
  // build attributes any GC that happens mid-build to the build, and produced a NEGATIVE delta in
  // production. `buildHeapCost` below measures after a collection instead.
  private final val MaxCachedDatabases = 2

  /** Keyed on the *entire* set of build inputs, so it cannot go stale by omission: every one of these
    * is a case class, so equality is structural all the way down.
    *
    * `VdjdbInstance` is part of the key by reference identity (it overrides nothing), which keeps two
    * `Database` instances — as separate test applications produce — from sharing a cached build. Note
    * that `Database` itself is a case class, so keying on *it* would have compared configurations and
    * conflated them.
    */
  private type ClonotypeDatabaseKey =
    (VdjdbInstance, AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsAnnotateScoring)

  private final val cache = new java.util.LinkedHashMap[ClonotypeDatabaseKey, ClonotypeDatabase](4, 0.75f, true) {
    override def removeEldestEntry(eldest: java.util.Map.Entry[ClonotypeDatabaseKey, ClonotypeDatabase]): Boolean =
      size() > MaxCachedDatabases
  }

  /** Building a `ClonotypeDatabase` re-materializes every VDJdb row and rebuilds the CDR3 tree, and the
    * engine does it more than once per call: `asClonotypeDatabase`, plus a full `VdjdbInstance.filter`
    * deep copy inside the epitope-size filter, plus another when `mhc.class` is restricted. None of it
    * depends on the sample, so identical parameters rebuilt an identical object on every annotation.
    *
    * Sharing one instance across concurrent searches is safe, verified against the `legacy-java`
    * engine source rather than assumed: `weightFunction` is the only non-final field on
    * `ClonotypeDatabase`, and its only writer, `onAdd()`, is called from `Database.addEntries` at build
    * time — no search path touches it. `search(Sample)` and `search(v, j, cdr3aa)` allocate their
    * result containers per call, and `TopNResultFilter`/`MaxScoreResultFilter` hold only final fields.
    *
    * That field is neither final nor volatile, though, so a reader on another thread needs a
    * happens-before edge to be guaranteed to see it — which is why the build happens inside the same
    * monitor that publishes it, and not through an unsynchronized map.
    *
    * Holding the lock across the build also serializes two simultaneous misses. That is the intent:
    * concurrent builds would double the peak heap of the most memory-hungry operation the app
    * performs. If a slow build behind the lock ever becomes the bottleneck, the upgrade is a per-key
    * lock, not a bigger cache.
    */
  /** Heap in use after asking for a collection, so the reading reflects what is actually *retained*.
    *
    * The naive total-free sample taken around a build charges it for any garbage that happened to be
    * collected meanwhile, which in production produced a negative "cost". System.gc is only a hint and
    * this is not free, but it runs once per cache miss — rare by construction — and a number that can
    * come out negative is worse than a slightly expensive one.
    */
  private def settledHeapBytes(): Long = {
    val runtime = Runtime.getRuntime
    System.gc()
    runtime.totalMemory - runtime.freeMemory
  }

  /** Every field that participates in the cache key. The first version logged only the database
    * parameters, which made two entries differing in scope or scoring look identical in the log and
    * left "why did this miss?" unanswerable. */
  private def describe(parameters: AnnotationsDatabaseQueryParams, searchScope: AnnotationsSearchScope,
                       scoring: AnnotationsAnnotateScoring): String = {
    val d = AnnotationsSearchScopeHammingDistance.sanitize(searchScope.hammingDistance)
    s"species=${parameters.species}, gene=${parameters.gene}, mhc=${parameters.mhc}, " +
      s"confidence=${parameters.confidenceThreshold}, minEpitopeSize=${parameters.minEpitopeSize}, " +
      s"scope=${d.substitutions}/${d.insertions}/${d.deletions}/${d.total}, " +
      s"matchV=${searchScope.matchV}, matchJ=${searchScope.matchJ}, scoring=${scoring.`type`}"
  }

  def createClonotypeDatabase(database: Database, parameters: AnnotationsDatabaseQueryParams,
                              searchScope: AnnotationsSearchScope, scoring: AnnotationsAnnotateScoring): ClonotypeDatabase = {
    // The donor HLA typing is applied to search results rather than to the database, so donors differing
    // only by HLA share one build.
    val key: ClonotypeDatabaseKey = (database.getInstance, parameters.copy(hla = None),
      searchScope.copy(hammingDistance = AnnotationsSearchScopeHammingDistance.sanitize(searchScope.hammingDistance)), scoring)

    cache.synchronized {
      val cached = cache.get(key)
      if (cached != null) {
        // Log hits too. Logging only misses makes the log unreadable as evidence: two builds in a row
        // look identical to a cache that is never hit AND to one that is working with two distinct
        // parameter sets, and the difference is the whole point of having the cache.
        logger.info(s"Reusing cached clonotype database [${describe(parameters, searchScope, scoring)}]")
        cached
      } else {
        val startedAt  = System.currentTimeMillis
        val usedBefore = settledHeapBytes()
        val built      = buildClonotypeDatabase(database, parameters, searchScope, scoring)
        val _          = cache.put(key, built)
        val cost       = (settledHeapBytes() - usedBefore) / (1024L * 1024L)
        logger.info(s"Built clonotype database [${describe(parameters, searchScope, scoring)}] in " +
          s"${System.currentTimeMillis - startedAt} ms, retained ~$cost MB, cached ${cache.size}/$MaxCachedDatabases")
        built
      }
    }
  }

  private def buildClonotypeDatabase(database: Database, parameters: AnnotationsDatabaseQueryParams,
                                     searchScope: AnnotationsSearchScope, scoring: AnnotationsAnnotateScoring): ClonotypeDatabase = {
    val hdistance = AnnotationsSearchScopeHammingDistance.sanitize(searchScope.hammingDistance)
    val scope = new SearchScope(hdistance.substitutions, hdistance.deletions, hdistance.insertions, hdistance.total,
      scoring.`type` == AnnotationsAnnotateScoring.VDJMATCH && scoring.vdjmatch.exhaustiveAlignment > 0,
      scoring.`type` == AnnotationsAnnotateScoring.VDJMATCH && scoring.vdjmatch.exhaustiveAlignment < 2)
    val filters = new util.ArrayList[TextFilter]()
    if (parameters.mhc != "MHCI+II") {
      filters.add(new ExactTextFilter("mhc.class", parameters.mhc, false))
    }

    val scoringBundle = scoring.`type` match {
      case AnnotationsAnnotateScoring.VDJMATCH => ScoringProvider.loadScoringBundle(parameters.species, parameters.gene, scoring.vdjmatch.scoringMode == 0)
      case _ => ScoringBundle.getDUMMY
    }

    val weightFunction = scoring.`type` match {
      case AnnotationsAnnotateScoring.VDJMATCH =>
        if (scoring.vdjmatch.hitFiltering.weightByInfo) DegreeWeightFunctionFactory.DEFAULT else DummyWeightFunctionFactory.INSTANCE
      case _ => DummyWeightFunctionFactory.INSTANCE
    }

    val resultFilter = scoring.`type` match {
      case AnnotationsAnnotateScoring.VDJMATCH =>
        scoring.vdjmatch.hitFiltering.hitType match {
          case "best" => new MaxScoreResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f)
          case "top" => new TopNResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f, scoring.vdjmatch.hitFiltering.topHitsCount)
          case "all" => new TopNResultFilter(scoring.vdjmatch.hitFiltering.probabilityThreshold / 100.0f, 1000)
          case _ => DummyResultFilter.INSTANCE
        }
      case _ => DummyResultFilter.INSTANCE
    }

    database.getInstance.filter(filters).asClonotypeDatabase(parameters.species, parameters.gene, scope, scoringBundle,
      weightFunction, resultFilter, searchScope.matchV, searchScope.matchJ, parameters.confidenceThreshold, parameters.minEpitopeSize)
  }
}

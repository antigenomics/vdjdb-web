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

import backend.server.ResultsTable
import backend.server.annotations.api.annotate.SampleAnnotateRequest
import backend.server.annotations.api.filters.{AnnotationsAnnotateScoring, AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryCounters, SummaryFieldCounter}
import backend.server.database.Database
import backend.server.motifs.Motifs
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Row
import com.antigenomics.vdjdb.impl.filter.DummyResultFilter
import com.antigenomics.vdjdb.impl.weights.DummyWeightFunctionFactory
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ClonotypeSearchResult, ScoringBundle}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjtools.sample.{Clonotype, Sample}
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.math.Ordering.String
import scala.util.Try

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

  def update(request: SampleAnnotateRequest, sample: Sample, database: Database, motifs: Motifs): IntersectionTable = {
    val (index, summaryIndex) =
      IntersectionTable.indexesFor(database, request.databaseQueryParams, request.searchScope, request.scoring)

    // The restrictions that used to be built into the database come first, then the ones that were
    // always applied here. `forall` over one list, so the order is immaterial to the outcome.
    val filters = IntersectionTable.databaseRestrictions(request.databaseQueryParams, request.searchScope) ++
      IntersectionTable.postSearchFilters(request.databaseQueryParams, motifs)

    val raw = index.search(sample)
    val found = raw.asScala.toList
      .map { case (clonotype, hits) =>
        (clonotype, hits.asScala.toList.filter(hit => filters.forall(allows => allows(clonotype, hit)))) }
      .filter { case (_, hits) => hits.nonEmpty }
      .sortWith { case ((c1, _), (c2, _)) => c1.getFreq > c2.getFreq }

    this.rows = found.map(IntersectionTableRow.createFromSearchResult)

    // `found` rather than `raw`, so the summary describes what the user is actually shown: with any
    // post-search filter active the unmatched tally has to grow by the clonotypes that filter removed.
    val (counters, notFound) =
      SearchSummary.summarize(found, sample, IntersectionTable.SummaryFields, summaryIndex)

    val charted = counters.map { counter =>
      SummaryFieldCounter(counter.name, counter.counters.filter { entry =>
        IntersectionTable.chartable(counter.name, entry.databaseUnique, request.databaseQueryParams.minEpitopeSize)
      })
    }

    this.summary = Some(SummaryCounters(
      charted :+ IntersectionTable.summarizeByHlaLocus(found),
      notFound,
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

  // Column names as literals, the way every other column in this file is named. The engine declares
  // them on ClonotypeDatabase as Groovy properties, which are not reachable as Java constants.
  private final val SpeciesColumn    = "species"
  private final val GeneColumn       = "gene"
  private final val MhcClassColumn   = "mhc.class"
  private final val ConfidenceColumn = "vdjdb.score"
  private final val VColumn          = "v.segm"
  private final val JColumn          = "j.segm"

  /** The value of `mhc` that means "do not restrict by MHC class at all". */
  private final val BothMhcClasses = "MHCI+II"

  /** A restriction on a single hit, given the sample clonotype it was found for.
    *
    * The clonotype is part of the signature because V/J matching needs it: `SegmentFilter` compares the
    * *query's* segments against the record's, and a `ClonotypeSearchResult` does not carry the query.
    * Every other restriction ignores it.
    */
  type HitFilter = (Clonotype, ClonotypeSearchResult) => Boolean

  /** Restrictions applied to search *results* rather than to the database that gets built.
    *
    * None of them is expressible as a vdjdb `TextFilter`: `ColumnwiseFilterBatch` binds one filter per
    * column and ANDs the lot, which covers neither the OR across `mhc.a`/`mhc.b`, nor a lookup against
    * an externally loaded motif index.
    *
    * Returned as a list, empty when nothing is restricted, so the caller can tell "no filtering
    * happened" from "filtering happened and removed nothing" — the summary counters depend on it.
    *
    * These are the annotate page's own filters. [[databaseRestrictions]] holds the ones that used to
    * be baked into the built database, which every caller of the shared index has to apply.
    */
  private def postSearchFilters(parameters: AnnotationsDatabaseQueryParams, motifs: Motifs): Seq[HitFilter] = {
    val donor = HlaAllele.parseAll(parameters.hla.getOrElse(""))
    val donorFilter: Option[HitFilter] =
      if (donor.isEmpty) None
      else Some((_: Clonotype, hit: ClonotypeSearchResult) =>
        MhcColumns.exists(column => HlaAllele.matches(hit.getRow.getAt(column).getValue, donor)))

    // The index is a Map already built at startup by the Motifs singleton and shared with the search
    // page, so this costs one hash lookup per hit and nothing per request. Reusing it also guarantees
    // "in TCREMP motif" means the same thing on both pages.
    def motifFilter(enabled: Option[Boolean], method: Option[String]): Option[HitFilter] =
      if (enabled.contains(true)) {
        val index = motifs.getCidLookupIndex(method)
        Some((_: Clonotype, hit: ClonotypeSearchResult) => Motifs.motifKey(hit.getRow).exists(key => index.contains(key)))
      } else {
        None
      }

    val validationFilter: Option[HitFilter] =
      if (parameters.independentValidationOnly.contains(true)) {
        Some((_: Clonotype, hit: ClonotypeSearchResult) => independentlyValidated(hit.getRow))
      } else {
        None
      }

    val confidenceFilter: Option[HitFilter] = parameters.minConfidenceScore.filter(_ > 0)
      .map(threshold => (_: Clonotype, hit: ClonotypeSearchResult) => confidenceScore(hit.getRow) >= threshold)

    Seq(donorFilter, motifFilter(parameters.inTcrempMotif, Some("tcremp")),
      motifFilter(parameters.inTcrnetMotif, None), validationFilter, confidenceFilter).flatten
  }

  /** The database population a request is asking to be annotated against, as a predicate.
    *
    * These four used to select the rows the per-request `ClonotypeDatabase` was built from, and are
    * reproduced here exactly:
    *
    *  - `asClonotypeDatabase` added `ExactTextFilter(species)` and `ExactTextFilter(gene)`, each only
    *    when the value is non-empty — Groovy's `if (species)` is false for `null` and for `""`.
    *  - the caller added `ExactTextFilter("mhc.class")` unless the request asked for both classes.
    *  - `asClonotypeDatabase` added `LevelFilter("vdjdb.score")` only when the threshold is positive.
    *
    * `ExactTextFilter` compares with `equalsIgnoreCase`, so this does too — not `==`.
    *
    * Written over a column lookup rather than a `Row` so the rule can be exercised without a database.
    */
  private[annotations] def accepts(parameters: AnnotationsDatabaseQueryParams)(valueAt: String => String): Boolean = {
    def exact(column: String, value: String): Boolean = valueAt(column).equalsIgnoreCase(value)

    (parameters.species.isEmpty || exact(SpeciesColumn, parameters.species)) &&
      (parameters.gene.isEmpty || exact(GeneColumn, parameters.gene)) &&
      (parameters.mhc == BothMhcClasses || exact(MhcClassColumn, parameters.mhc)) &&
      (parameters.confidenceThreshold <= 0 || atLeastConfidence(valueAt(ConfidenceColumn), parameters.confidenceThreshold))
  }

  /** Same predicate, over a database row. */
  private def acceptedRow(parameters: AnnotationsDatabaseQueryParams): Row => Boolean =
    (row: Row) => accepts(parameters)(column => row.getAt(column).getValue)

  /** `LevelFilter.passInner`, replicated: the entry is read as a double and passes when it is at least
    * the threshold, and anything unparseable *fails*.
    *
    * Deliberately not [[confidenceScore]], which treats an unreadable score as zero. The two agree on
    * every value VDJdb actually carries; they are kept apart because they replicate two different
    * filters, and the confidence checkbox is not the confidence threshold.
    */
  private[annotations] def atLeastConfidence(value: String, threshold: Int): Boolean =
    Try(value.trim.toDouble).toOption.exists(_ >= threshold.toDouble)

  /** `SegmentFilter.passInner`, replicated.
    *
    * The engine installed this per search, not per database: `ClonotypeDatabase.search(v, j, cdr3aa)`
    * built a `SegmentFilter` from the *query* clonotype's segment and ran it over the candidate rows.
    * So moving it out of the index costs nothing and changes nothing — it was never an index input.
    *
    * A segment string is a comma-separated list, upper-cased, with the allele suffix dropped. Either
    * side auto-passes when it is empty or names `.`, VDJdb's "not recorded"; otherwise the two lists
    * have to intersect. The intersection is tested in both directions, exactly as the original does.
    */
  private[annotations] def segmentsMatch(query: String, entry: String): Boolean = {
    val queried = segmentSet(query)
    val stored  = segmentSet(entry)
    autoPass(queried) || autoPass(stored) ||
      stored.exists(segment => queried.contains(segment)) || queried.exists(segment => stored.contains(segment))
  }

  private def segmentSet(value: String): Seq[String] =
    value.toUpperCase.split(",").map(_.split("\\*")(0)).toSeq

  private def autoPass(segments: Seq[String]): Boolean = segments.isEmpty || segments.contains(".")

  /** Everything that used to be decided when the `ClonotypeDatabase` was built, as predicates over the
    * results of searching the one shared index.
    *
    * Public because the multisample analysis searches the same shared index and has to narrow it the
    * same way. It applies only these, not [[postSearchFilters]] — which it has never applied.
    */
  def databaseRestrictions(parameters: AnnotationsDatabaseQueryParams,
                           searchScope: AnnotationsSearchScope): Seq[HitFilter] = {
    val accepted = acceptedRow(parameters)
    val population: HitFilter = (_: Clonotype, hit: ClonotypeSearchResult) => accepted(hit.getRow)

    def segment(column: String, queried: Clonotype => String): HitFilter =
      (clonotype: Clonotype, hit: ClonotypeSearchResult) =>
        segmentsMatch(queried(clonotype), hit.getRow.getAt(column).getValue)

    Seq(Some(population),
      if (searchScope.matchV) Some(segment(VColumn, (c: Clonotype) => c.getV)) else None,
      if (searchScope.matchJ) Some(segment(JColumn, (c: Clonotype) => c.getJ)) else None).flatten
  }

  /** The curated `evidence.validation.independent` flag — "antigen specificity independently validated
    * in another study" (`vdjdb.meta.txt`). Same column and same test the search page uses
    * (`SearchTable`), so the identically-named filter means the same thing on both pages.
    *
    * This replaced a literal "record cites >= 2 references" count, which was measured to be a no-op:
    * `reference.id` is comma-joined only in *vdjdb.slim.txt*, which merges duplicate records. The
    * annotate path loads the full `vdjdb.txt` (`Database.createInstanceFromConfiguration`), one row
    * per record, where exactly **2 of 228,214 rows** carry more than one reference. The curated flag
    * is true on 10,990.
    */
  private def independentlyValidated(row: Row): Boolean =
    Option(row.getAt("evidence.validation.independent")).exists(_.getValue.trim.equalsIgnoreCase("true"))

  /** `vdjdb.score` as an int, 0 for anything unparseable or absent — a record whose confidence cannot
    * be read is treated as the lowest confidence rather than silently kept. */
  private def confidenceScore(row: Row): Int =
    Option(row.getAt(ConfidenceColumn)).map(_.getValue.trim).flatMap(value => Try(value.toInt).toOption).getOrElse(0)

  private final val EpitopeField = "antigen.epitope"

  /** The starburst fields, as `ClonotypeSearchSummary.FIELDS_STARBURST` defined them. Held here now
    * that the summary is computed in [[SearchSummary]] rather than by the engine. */
  final val SummaryFields: Seq[String] =
    Seq("mhc.class", "mhc.a", "mhc.b", "antigen.species", "antigen.gene", "antigen.epitope")

  /** Whether a summary entry is worth putting on a chart.
    *
    * `minEpitopeSize` used to be a *database* filter: `EpitopeSizeFilterUtil` counted records per
    * epitope and the whole index was built without the rare ones, so those epitopes could not be
    * matched at all. That conflated two different things — a rare epitope is still a real annotation,
    * it just makes for a noisy starburst wedge. It also forced a database rebuild whenever the value
    * changed, and made the epitope counts depend on which species/gene the index was built for.
    *
    * Now it only thins the plots. Every hit stays in the table; an epitope the database knows fewer
    * than `minSize` records for is left off the chart. `databaseUnique` is the count of database
    * records for that value, which is exactly what "epitope size" meant before.
    */
  private def chartable(field: String, databaseUnique: Long, minSize: Int): Boolean =
    field != EpitopeField || minSize <= 0 || databaseUnique >= minSize.toLong

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

  /** The CDR3 search index, keyed on its search scope and on nothing else.
    *
    * Every restriction a request can express is now a predicate over results — see
    * [[databaseRestrictions]] — so the index no longer varies with species, gene, MHC class, confidence
    * or V/J matching, and with VDJMatch scoring snapped away it does not vary with scoring either. The
    * only remaining input is the scope, which is what the CDR3 tree walk itself consumes, and
    * `AnnotationsSearchScopeHammingDistance.sanitize` leaves exactly two of those.
    *
    * So this holds at most two entries per database and never evicts. It is deliberately not built at
    * boot: most traffic is the Browse tab, which must not pay for a facility it does not use.
    *
    * Measured in production, against the real database: the unfiltered index holds 228,214 rows to the
    * default human/TRB index's 114,196, builds in the same ~1.5 s, and *retains less heap* — 435 MB
    * against 491-494 MB — because it is built once from the instance rather than through the deep
    * copies `VdjdbInstance.filter` makes on the way. Searching 63,737 clonotypes single-threaded costs
    * 378-406 ms against 326-441 ms (Hamming) and 604-637 ms against 565-607 ms (Levenshtein). Two full
    * indexes is 870 MB standing, against ~985 MB steady and ~1,475 MB peak for the cache this replaces.
    *
    * `VdjdbInstance` is in the key by reference identity (it overrides nothing), which keeps two
    * `Database` instances — as separate test applications produce — from sharing one index. Keying on
    * `Database` instead would have compared configurations, which are equal across test applications.
    */
  private type SearchIndexKey = (VdjdbInstance, AnnotationsSearchScopeHammingDistance)

  private final val searchIndexes = mutable.HashMap.empty[SearchIndexKey, ClonotypeDatabase]

  /** Denominators are keyed on the population they describe, *not* on the search scope.
    *
    * This is the trap in sharing one index. `SummaryIndex` answers "how many distinct CDR3s does the
    * database hold for this column value", and it used to answer it from the rows of a species- and
    * gene-filtered database. Computed over the shared index instead it would silently span every
    * species and gene, and every chart denominator would change with no error anywhere.
    *
    * So it is computed from the shared index but counts only the rows [[accepts]] admits, and cached
    * under exactly the parameters that predicate reads. These are counts rather than sets — small, and
    * few enough distinct combinations that the LRU below is a formality.
    */
  private type SummaryIndexKey = (VdjdbInstance, String, String, String, Int)

  private final val MaxCachedSummaryIndexes = 16

  private final val summaryIndexes = new java.util.LinkedHashMap[SummaryIndexKey, SummaryIndex](16, 0.75f, true) {
    override def removeEldestEntry(eldest: java.util.Map.Entry[SummaryIndexKey, SummaryIndex]): Boolean =
      size() > MaxCachedSummaryIndexes
  }

  /** Heap in use after asking for a collection, so the reading reflects what is actually *retained*.
    *
    * The naive total-free sample taken around a build charges it for any garbage that happened to be
    * collected meanwhile, which in production produced a negative "cost". System.gc is only a hint and
    * this is not free, but it runs twice per index built and there are at most two indexes for the
    * lifetime of the process, where it used to run on every cache miss.
    */
  private def settledHeapBytes(): Long = {
    val runtime = Runtime.getRuntime
    System.gc()
    runtime.totalMemory - runtime.freeMemory
  }

  private def describeScope(scope: AnnotationsSearchScopeHammingDistance): String =
    s"${scope.substitutions}/${scope.insertions}/${scope.deletions}/${scope.total}"

  private def describePopulation(parameters: AnnotationsDatabaseQueryParams): String =
    s"species=${parameters.species}, gene=${parameters.gene}, mhc=${parameters.mhc}, " +
      s"confidence=${parameters.confidenceThreshold}"

  /** The two shared indexes an annotation runs against: the CDR3 search index for the request's scope,
    * and the summary denominators for the population the request restricts the database to.
    *
    * Both are built on first use and kept. Neither depends on the sample, and after this change
    * neither depends on the request beyond the two keys above.
    */
  def indexesFor(database: Database, parameters: AnnotationsDatabaseQueryParams,
                 searchScope: AnnotationsSearchScope, scoring: AnnotationsAnnotateScoring): (ClonotypeDatabase, SummaryIndex) = {
    if (AnnotationsAnnotateScoring.sanitize(scoring).`type` != scoring.`type`) {
      logger.warn(s"Annotate scoring type ${scoring.`type`} is not supported and was ignored; using SIMPLE")
    }
    val index = searchIndex(database, AnnotationsSearchScopeHammingDistance.sanitize(searchScope.hammingDistance))
    (index, summaryIndex(database.getInstance, index, parameters))
  }

  /** Building a `ClonotypeDatabase` materializes a `Row` per VDJdb record and builds the CDR3 tree over
    * them, so this is by far the most memory-hungry thing the application does. Sharing one instance
    * across concurrent searches is safe, verified against the engine source rather than assumed:
    * `weightFunction` is the only non-final field on `ClonotypeDatabase`, and its only writer,
    * `onAdd()`, runs from `Database.addEntries` at build time — no search path touches it.
    * `search(Sample)` and `search(v, j, cdr3aa)` allocate their result containers per call.
    *
    * That field is neither final nor volatile, though, so a reader on another thread needs a
    * happens-before edge to be guaranteed to see it — which is why the build happens inside the same
    * monitor that publishes it, and not through an unsynchronized map. Holding the lock across the
    * build also serializes two simultaneous first calls, which is the intent: concurrent builds would
    * double the peak heap of the most memory-hungry operation the app performs.
    */
  private def searchIndex(database: Database, scope: AnnotationsSearchScopeHammingDistance): ClonotypeDatabase =
    searchIndexes.synchronized {
      val key = (database.getInstance, scope)
      searchIndexes.get(key) match {
        case Some(index) =>
          index
        case None =>
          val startedAt  = System.currentTimeMillis
          val usedBefore = settledHeapBytes()
          val built      = buildSearchIndex(database, scope)
          searchIndexes.update(key, built)
          val cost       = (settledHeapBytes() - usedBefore) / (1024L * 1024L)
          logger.info(s"Built search index [scope=${describeScope(scope)}] over ${built.getRows.size} rows in " +
            s"${System.currentTimeMillis - startedAt} ms, retained ~$cost MB, ${searchIndexes.size} index(es) held")
          built
      }
    }

  private def buildSearchIndex(database: Database, scope: AnnotationsSearchScopeHammingDistance): ClonotypeDatabase = {
    // `exhaustive` and `greedy` were only ever turned on by VDJMatch scoring, which the server snaps
    // away; SIMPLE always produced (false, false). The argument order — substitutions, deletions,
    // insertions, total — is the engine's, not this class's field order.
    val searchScope = new SearchScope(scope.substitutions, scope.deletions, scope.insertions, scope.total, false, false)

    // null species and null gene, so `asClonotypeDatabase` installs no filter for either: Groovy's
    // `if (species)` is false for null. Zero for the confidence threshold and for the epitope size
    // switches those two off the same way. That leaves an index over every row of the database, which
    // is the whole point — everything that used to narrow it is a predicate in `databaseRestrictions`
    // now, and `minEpitopeSize` stopped reaching the build when it became a chart-thinning number.
    database.getInstance.asClonotypeDatabase(null, null, searchScope, ScoringBundle.getDUMMY,
      DummyWeightFunctionFactory.INSTANCE, DummyResultFilter.INSTANCE, false, false, 0, 0)
  }

  private def summaryIndex(instance: VdjdbInstance, index: ClonotypeDatabase,
                           parameters: AnnotationsDatabaseQueryParams): SummaryIndex =
    summaryIndexes.synchronized {
      val key = (instance, parameters.species, parameters.gene, parameters.mhc, parameters.confidenceThreshold)
      val cached = summaryIndexes.get(key)
      if (cached != null) {
        cached
      } else {
        val startedAt = System.currentTimeMillis
        val built     = SummaryIndex.build(index, SummaryFields, acceptedRow(parameters))
        val _         = summaryIndexes.put(key, built)
        logger.info(s"Built summary index [${describePopulation(parameters)}] over " +
          s"${built.databaseCdr3Count} distinct CDR3s in ${System.currentTimeMillis - startedAt} ms, " +
          s"cached ${summaryIndexes.size}/$MaxCachedSummaryIndexes")
        built
      }
    }
}

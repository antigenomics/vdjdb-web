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

import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryFieldCounter}
import com.antigenomics.vdjdb.db.Row
import com.antigenomics.vdjdb.impl.{ClonotypeDatabase, ClonotypeSearchResult}
import com.antigenomics.vdjtools.sample.{Clonotype, Sample}

import scala.collection.JavaConverters._
import scala.collection.mutable

/** Per-field denominators for the summary charts: for each column value, how many distinct CDR3s the
  * database holds for it.
  *
  * This exists because it is the single most expensive thing in the annotate path, and it does not
  * depend on the sample. `ClonotypeSearchSummary`'s constructor recomputes it on every request with a
  * nested scan — for each column, for each distinct value, walk every row:
  *
  * {{{
  * database[columnName].values.each { value ->
  *     database.rows.each { r -> if (r[columnName].value == value) ... }
  * }
  * }}}
  *
  * Measured on the production database: 254,885,472 row visits and 45.6 seconds for the human/TRB
  * index, 595,410,326 and 113.9 seconds unfiltered — against 1.5 s to build the index and 0.4 s to
  * search a 63k-clonotype repertoire through it. Every user paid it, every time, for numbers that
  * were identical each time.
  *
  * One pass in the other order — for each row, for each column, record its CDR3 under that column's
  * value — computes exactly the same thing in `rows x columns` steps instead of
  * `rows x sum(distinct values)`. On the same database that is 1.4 million steps rather than 595
  * million.
  */
final case class SummaryIndex(perColumn: Map[String, Map[String, Long]], databaseCdr3Count: Long)

object SummaryIndex {

  /** @param database the index to read rows from — now one shared index over the whole of VDJdb, not a
    *                 database built for this request
    * @param accept   which of those rows belong to the population being described. This is what keeps
    *                 the denominators meaning what they meant: they used to be counted from a database
    *                 already filtered by species, gene, MHC class and confidence, so counting every row
    *                 of a shared index would silently widen every chart's denominator to span all
    *                 species and genes at once — with nothing failing anywhere to say so.
    */
  def build(database: ClonotypeDatabase, fields: Seq[String], accept: Row => Boolean): SummaryIndex = {
    val cdr3Column = database.getCdr3ColName
    // Sets while accumulating because the quantity is *distinct* CDR3s, then discarded down to counts
    // — keeping them would retain a second reference to every CDR3 string in the database for the
    // lifetime of the index.
    val accumulator = fields.map(field => field -> mutable.HashMap.empty[String, mutable.HashSet[String]]).toMap
    val allCdr3     = mutable.HashSet.empty[String]

    // `if` rather than `.filter`, which on the buffer this yields is strict and would materialize a
    // second list of a hundred thousand row references for nothing.
    database.getRows.asScala.foreach { row =>
      if (accept(row)) {
        val cdr3 = row.getAt(cdr3Column).getValue
        allCdr3 += cdr3
        fields.foreach { field =>
          val value = row.getAt(field).getValue
          accumulator(field).getOrElseUpdate(value, mutable.HashSet.empty[String]) += cdr3
        }
      }
    }

    SummaryIndex(
      accumulator.map { case (field, values) => field -> values.map { case (v, set) => v -> set.size.toLong }.toMap },
      allCdr3.size.toLong)
  }
}

/** Counters for one field value, accumulated over the search results. */
private final class MutableCounter {
  private val clonotypes = mutable.HashSet.empty[Clonotype]
  var unique: Int        = 0
  var reads: Long        = 0L
  var frequency: Double  = 0.0

  /** Deduplicated by clonotype, matching `ClonotypeCounter.update`: a clonotype that matches three
    * records all sharing an epitope counts once for that epitope, not three times. */
  def update(clonotype: Clonotype): Unit = {
    if (clonotypes.add(clonotype)) {
      unique += 1
      reads += clonotype.getCount.toLong
      frequency += clonotype.getFreq
    }
  }
}

/** Scala replacement for `ClonotypeSearchSummary`.
  *
  * Same output as before — the aggregation half of the original was already cheap and is reproduced
  * faithfully, including the clonotype deduplication and the way `notFound` is derived by subtracting
  * the matched totals from the sample totals. What changes is that the denominators come from a
  * [[SummaryIndex]] computed once per database rather than rebuilt per request.
  */
object SearchSummary {

  private final val EpitopeField = "antigen.epitope"
  private final val SpeciesField = "antigen.species"

  /** @param prior the control-derived Beta coefficients for an epitope, or `None` where they were not
    *              measured — see [[ControlPrior]]. Consulted for the epitope field only; nothing else
    *              in the summary has a null to be read against.
    * @return the per-field counters, and the `notFound` counter
    */
  def summarize(found: Seq[(Clonotype, Seq[ClonotypeSearchResult])],
                sample: Sample,
                fields: Seq[String],
                index: SummaryIndex,
                prior: String => Option[(Double, Double)] = _ => None):
  (Seq[SummaryFieldCounter], SummaryClonotypeCounter) = {
    val counters = fields.map(field => field -> mutable.LinkedHashMap.empty[String, MutableCounter]).toMap

    // Which antigen species each epitope belongs to, recorded while the rows are already in hand. The
    // per-field counters are flat, so nothing else in the payload relates one field's values to
    // another's, and the client has no way to reconstruct it. First hit wins: an epitope sequence is a
    // property of its antigen, so every row carrying it agrees.
    val trackSpecies   = fields.contains(SearchSummary.EpitopeField) && fields.contains(SearchSummary.SpeciesField)
    val epitopeSpecies = mutable.HashMap.empty[String, String]

    var matchedUnique: Int       = 0
    var matchedReads: Long       = 0L
    var matchedFrequency: Double = 0.0

    found.foreach { case (clonotype, hits) =>
      if (hits.nonEmpty) {
        matchedUnique += 1
        matchedReads += clonotype.getCount.toLong
        matchedFrequency += clonotype.getFreq
      }
      hits.foreach { hit =>
        val row = hit.getRow
        if (trackSpecies) {
          epitopeSpecies.getOrElseUpdate(row.getAt(SearchSummary.EpitopeField).getValue,
            row.getAt(SearchSummary.SpeciesField).getValue)
        }
        fields.foreach { field =>
          val value = row.getAt(field).getValue
          counters(field).getOrElseUpdate(value, new MutableCounter).update(clonotype)
        }
      }
    }

    val fieldCounters = fields.map { field =>
      val denominators = index.perColumn.getOrElse(field, Map.empty[String, Long])
      val isEpitope    = field == SearchSummary.EpitopeField
      SummaryFieldCounter(field, counters(field).toSeq.collect {
        case (value, counter) if counter.unique != 0 =>
          val beta = if (isEpitope) prior(value) else None
          SummaryClonotypeCounter(value, counter.unique, denominators.getOrElse(value, 0L),
            counter.frequency, counter.reads, if (isEpitope) epitopeSpecies.get(value) else None,
            beta.map(_._1), beta.map(_._2))
      })
    }

    // Unmatched is the sample minus what matched, exactly as the engine derived it. Clamped at zero:
    // the subtraction is only meaningful while the summary sees the same result set the table does,
    // and a negative count rendered into a chart is worse than a zero.
    val notFound = SummaryClonotypeCounter("notFound",
      math.max(0, sample.getDiversity - matchedUnique),
      index.databaseCdr3Count,
      math.max(0.0, sample.getFreq - matchedFrequency),
      math.max(0L, sample.getCount - matchedReads))

    (fieldCounters, notFound)
  }
}

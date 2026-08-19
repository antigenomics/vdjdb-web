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

package backend.server.database.filters

import java.util

import backend.server.database.Database
import com.antigenomics.vdjdb.sequence.{DummyAlignmentScoring, SearchScope, SequenceFilter}
import com.antigenomics.vdjdb.text._

import scala.collection.JavaConverters._
import scala.collection.mutable.ListBuffer
import scala.util.{Failure, Success, Try}

case class DatabaseFilters(text: util.ArrayList[TextFilter], sequence: util.ArrayList[SequenceFilter], options: Seq[(String, Boolean)],
                          validationModes: Set[String], motifModes: Set[String], structureModes: Set[String], warnings: Seq[String])

object DatabaseFilters {
  // Ceilings on a fuzzy cdr3/epitope search. They live here because both entry points -- the HTTP
  // action and the websocket actor -- build their filters through createFromRequest, so this is the
  // only place that sees every search before it reaches the database.
  //
  // The total is the number that matters. milib walks an edit-distance neighbourhood whose size
  // grows combinatorially in the total number of edits, and nothing downstream can stop it once it
  // starts: vdjmatch exposes no cancellation and BranchingEnumerator never checks the interrupt
  // flag, so an over-wide scope pins a core until the process restarts. Capping `total` alone is
  // enough to bound the walk, and unlike clamping each field on its own it cannot produce an
  // incoherent scope -- AnnotationsSearchScopeHammingDistance.sanitize documents why that mattered.
  final val MaxSubstitutions: Int = 5
  final val MaxInsertions: Int = 3
  final val MaxDeletions: Int = 3
  final val MaxTotalEdits: Int = 5

  final val MalformedSequenceFilterMessage: String =
    "A sequence filter could not be read and was ignored. Expected '<query>:<substitutions>:<insertions>:<deletions>'."

  def malformedValueMessage(column: String, filterType: String): String =
    s"The '$column' $filterType filter could not be read and was ignored."
  final val BudgetExceededMessage: String =
    s"A sequence filter asked for more than $MaxTotalEdits edits and was narrowed to $MaxTotalEdits. " +
      s"At most $MaxSubstitutions substitutions, $MaxInsertions insertions and $MaxDeletions deletions are allowed, " +
      s"and no more than $MaxTotalEdits edits in total."

  private def clamp(value: Int, max: Int): Int = math.max(0, math.min(value, max))

  /** Parses the colon-packed `"<query>:<subs>:<ins>:<del>"` value and bounds it. Returns None and
    * records a warning on anything it cannot read -- a malformed value used to throw out of here
    * and surface as a 500. */
  private def parseSequenceFilter(value: String, warnings: ListBuffer[String]): Option[(String, SearchScope)] = {
    val values = value.split(":")
    Try((values(0), values(1).trim.toInt, values(2).trim.toInt, values(3).trim.toInt)).toOption match {
      case None =>
        warnings += MalformedSequenceFilterMessage
        None
      case Some((query, _, _, _)) if query.trim.isEmpty =>
        // ":1:1:1" parses cleanly and then blows up building an empty AminoAcidSequence, which reached
        // the client as a 500 on the HTTP path and as no reply at all on the websocket.
        warnings += MalformedSequenceFilterMessage
        None
      case Some((query, substitutions, insertions, deletions)) =>
        val boundedSubstitutions = clamp(substitutions, MaxSubstitutions)
        val boundedInsertions = clamp(insertions, MaxInsertions)
        val boundedDeletions = clamp(deletions, MaxDeletions)
        val requested = boundedSubstitutions + boundedInsertions + boundedDeletions
        val total = math.min(requested, MaxTotalEdits)
        if (boundedSubstitutions != substitutions || boundedInsertions != insertions ||
            boundedDeletions != deletions || total != requested) {
          warnings += BudgetExceededMessage
        }
        // SearchScope takes deletions before insertions; DatabaseFiltersSpec pins that mapping.
        Some((query, new SearchScope(boundedSubstitutions, boundedDeletions, boundedInsertions, total)))
    }
  }

  /** Builds one filter and records it, or records a warning if the value cannot be read.
    *
    * Every one of these constructors parses its own value and throws on anything it does not like:
    * MinMaxFilter takes two ints we split out ourselves, LevelFilter parses a double, PatternTextFilter
    * compiles a regex and SequenceFilter builds an AminoAcidSequence. None of that was guarded, so a
    * value the UI cannot produce but the API accepts -- "range" without a colon, "level" of "zzz",
    * "pattern" of "CAS[" -- came back as a 500 from the HTTP action, and over the websocket as nothing
    * at all: the exception escaped WebSocketActor.receive, the client's promise never settled and the
    * table stayed on its spinner for good.
    */
  private def addFilter[F](into: util.ArrayList[F], warnings: ListBuffer[String],
                           request: DatabaseFilterRequest)(build: => F): Unit =
    Try(build) match {
      case Success(filter) => into.add(filter)
      case Failure(_)      => warnings += malformedValueMessage(request.column, request.filterType)
    }

  private def parseModes(request: List[DatabaseFilterRequest], column: String): Set[String] =
    request.filter(f => f.column == column && !f.negative)
      .flatMap(_.value.split(",").map(_.trim).filter(_.nonEmpty))
      .toSet

  def createFromRequest(request: List[DatabaseFilterRequest], database: Database): DatabaseFilters = {
    val warnings = ListBuffer[String]()
    val text = new util.ArrayList[TextFilter]()
    val sequence = new util.ArrayList[SequenceFilter]()
    val options = request.filter(_.column.startsWith("option:")).flatMap { f =>
      Try(f.value.toBoolean).toOption match {
        case Some(enabled) => Some((f.column.stripPrefix("option:"), enabled))
        case None =>
          warnings += malformedValueMessage(f.column, DatabaseFilterType.Exact)
          None
      }
    }
    val validationModes = parseModes(request, DatabaseFilterType.EvidenceValidation)
    val motifModes      = parseModes(request, DatabaseFilterType.EvidenceMotif)
    val structureModes  = parseModes(request, DatabaseFilterType.EvidenceStructure)

    request.filter(f => !f.column.startsWith("option:") && !f.column.startsWith("evidence:")).foreach((filter: DatabaseFilterRequest) => {
      if (database.getInstance.getDbInstance.getColumns.asScala.exists(_.getName == filter.column)) {
        filter.filterType match {
          case DatabaseFilterType.Sequence =>
            if (filter.column.startsWith("cdr3") || filter.column.startsWith("antigen.epitope")) {
              parseSequenceFilter(filter.value, warnings).foreach { case (query, scope) =>
                addFilter(sequence, warnings, filter)(new SequenceFilter(filter.column, query, scope, DummyAlignmentScoring.INSTANCE))
              }
            } else {
              warnings += "Sequence filters can only be applied to 'cdr3' or 'antigen.epitope'"
            }
          case DatabaseFilterType.Exact => addFilter(text, warnings, filter)(new ExactTextFilter(filter.column, filter.value, filter.negative))
          case DatabaseFilterType.SubstringSet => addFilter(text, warnings, filter)(new SubstringSetTextFilter(filter.column, filter.value, filter.negative))
          case DatabaseFilterType.ExactSet => addFilter(text, warnings, filter)(new ExactSetTextFilter(filter.column, filter.value, filter.negative))
          case DatabaseFilterType.Pattern => addFilter(text, warnings, filter)(new PatternTextFilter(filter.column, filter.value, filter.negative))
          case DatabaseFilterType.Level => addFilter(text, warnings, filter)(new LevelFilter(filter.column, filter.value, filter.negative))
          case DatabaseFilterType.Range =>
            addFilter(text, warnings, filter) {
              val bounds = filter.value.split(":")
              new MinMaxFilter(filter.column, bounds(0).trim.toInt, bounds(1).trim.toInt)
            }
          case _ =>
            warnings += ("Invalid filter type: " + filter.filterType)
        }
      } else {
        warnings += ("Invalid column name: " + filter.column)
      }
    })
    DatabaseFilters(text, sequence, options, validationModes, motifModes, structureModes, warnings)
  }

}

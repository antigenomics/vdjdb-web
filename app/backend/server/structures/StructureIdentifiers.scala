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

import java.util.Locale

import scala.util.matching.Regex

/** The string handling behind structure lookup: turning whatever a row carries into a structure id,
  * and building the key that joins a chain to its motif cluster.
  *
  * These were private methods on the `Structures` instance, which made them unreachable from a test
  * without a `Database`, a Guice application and a fixture directory on disk — so the rules below,
  * every one of them a decision someone made deliberately, were pinned by nothing. They depend on no
  * instance state, so there is no reason for them to live there.
  */
object StructureIdentifiers {

  /** At least four characters of letters, digits, underscore or hyphen. Loose on purpose: ids run
    * from a 4-character PDB accession (`1abc`) to a 64-character sha256, and both must pass. */
  final val TokenPattern: Regex = "^[A-Za-z0-9_-]{4,}$".r

  /** Pulls a usable id out of a free-text cell.
    *
    * Callers pass things like `"structures/1abc.html"`, `"1abc, 2def"` or a bare hash, so the value
    * is stripped of an `.html` suffix and split on whitespace, commas, semicolons, pipes, colons and
    * both slash directions. The **last** matching token wins, which is what makes a path yield its
    * filename rather than a directory along the way.
    */
  def sanitize(candidate: String): Option[String] =
    Option(candidate).map(_.trim).filter(_.nonEmpty).flatMap { trimmed =>
      val withoutExtension =
        if (trimmed.toLowerCase(Locale.ROOT).endsWith(".html")) trimmed.dropRight(".html".length) else trimmed

      withoutExtension
        .replace('\\', '/')
        .split("[\\s,;|:/]+")
        .reverseIterator
        .map(_.trim)
        .collectFirst { case token if TokenPattern.pattern.matcher(token).matches() => token }
    }

  /** Join key between a structure row and a motif cluster membership row.
    *
    * Lower-cased and pipe-joined. Returns `""` — never a partial key — when any component is blank,
    * because a key built from five of six fields would collide across unrelated chains rather than
    * simply failing to match.
    */
  def motifClusterKey(species: String, gene: String, epitope: String,
                      cdr3: String, vSegment: String, jSegment: String): String = {
    val parts = Seq(species, gene, epitope, cdr3, vSegment, jSegment)
      .map(part => Option(part).map(_.trim.toLowerCase(Locale.ROOT)).getOrElse(""))

    if (parts.exists(_.isEmpty)) "" else parts.mkString("|")
  }

  /** The CDR3 shown against a search hit.
    *
    * An exact search shows the query itself. A substring search shows where the query sat inside the
    * matched CDR3, with `X` standing in for the flanks — `"SSY"` inside `"CASSYRF"` renders as
    * `"XXSSYXX"`, always the length of the candidate. A query that does not occur falls back to the
    * query alone.
    */
  def substringPattern(candidateUpper: String, queryUpper: String, substring: Boolean): String =
    if (!substring) {
      queryUpper
    } else if (queryUpper.isEmpty) {
      ""
    } else {
      candidateUpper.indexOf(queryUpper) match {
        case -1 => queryUpper
        case at =>
          val trailing = candidateUpper.length - queryUpper.length - at
          ("X" * at) + queryUpper + ("X" * math.max(0, trailing))
      }
    }

  /** Most frequent pattern, longest breaking the tie. */
  def preferredPattern(patternCounts: collection.Map[String, Int], fallback: String): String =
    if (patternCounts.isEmpty) fallback
    else patternCounts.toSeq.minBy { case (pattern, count) => (-count, -pattern.length) }._1

  /** Chain label for a hit, from the genes it was found on.
    *
    * `None` when nothing matched. Sorted rather than taken in encounter order: the labels arrive in a
    * `Set`, so an unsorted single label would be stable only by luck.
    */
  def chainLabels(labels: Iterable[String]): Option[String] = {
    val distinct = labels.toSeq.distinct.sorted
    if (distinct.isEmpty) None else Some(distinct.mkString(", "))
  }
}

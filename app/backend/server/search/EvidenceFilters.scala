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

package backend.server.search

/** The Evidence column's filters: which record has independent support, and of what kind.
  *
  * Three kinds, and only two of them are columns. Validation and structure evidence are booleans the
  * database carries per record, so they are a mode-to-column lookup; motif evidence is not stored at
  * all and is decided at request time against the motif availability index, which is why it stays in
  * `SearchTable` where that index is reachable.
  *
  * Within a kind the modes are OR-ed - asking for native or contacts means either will do - and the
  * kinds are AND-ed by being applied in sequence. That asymmetry is deliberate: a reader ticking two
  * boxes under one heading is widening, and ticking boxes under two headings is narrowing.
  *
  * An unknown mode matches nothing rather than everything. The UI can only send the modes below, but
  * the filter arrives as free text over the API, and a typo that quietly disabled the filter would be
  * worse than one that returns nothing.
  */
object EvidenceFilters {

  /** Set by `tools/reconcile_structures.py`; see SOURCES.md. */
  final val ValidationColumns: Map[String, String] = Map(
    "same.study"  -> "evidence.validation.same.study",
    "independent" -> "evidence.validation.independent"
    // "tcrvdb" is offered in the UI as a disabled "coming soon" box and has no column yet.
  )

  final val StructureColumns: Map[String, String] = Map(
    "native"   -> "evidence.structure.native",
    "contacts" -> "evidence.structure.contacts",
    "quality"  -> "evidence.structure.quality"
  )

  /**
   * Whether a record satisfies any of the requested modes. No modes means no filtering.
   *
   * Takes a column lookup rather than a `com.antigenomics.vdjdb.db.Row` so the rule can be read and
   * tested on its own: `Row` cannot be constructed outside the library - `Column` is abstract and an
   * `Entry` needs the `Row` that holds it - so a signature taking one would have put this logic
   * behind a Guice application and a fixture database.
   */
  def matches(valueOf: String => Option[String], modes: Iterable[String], columns: Map[String, String]): Boolean =
    modes.isEmpty || modes.exists(mode => columns.get(mode).exists(column => isTrue(valueOf(column))))

  /** The columns hold the string `true`, not a boolean, and are absent on older database builds. */
  def isTrue(value: Option[String]): Boolean =
    value.exists(_.trim.equalsIgnoreCase("true"))
}

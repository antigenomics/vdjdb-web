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

/** An HLA allele at up to two fields of resolution: `HLA-A*02:01` is gene `A`, fields `02`, `01`.
  *
  * Fields three and four are dropped on purpose — they encode synonymous and non-coding differences
  * that cannot change peptide binding, and no VDJdb record carries them anyway.
  */
final case class HlaAllele(gene: String, fields: Seq[String]) {

  /** Two alleles are compatible when they name the same gene and agree on every field they *both*
    * carry — matching is a two-way prefix test, not equality.
    *
    * This is forced by the data: VDJdb records are typed at whatever resolution the source study
    * reported, so `HLA-A*02` (12 672 rows) and `HLA-A*02:01` (67 915 rows) both occur. Requiring
    * equality would drop every low-resolution record for a 4-digit-typed donor. Comparing only the
    * shared fields keeps those, while still separating `A*02:01` from `A*02:05`.
    */
  def compatibleWith(other: HlaAllele): Boolean =
    gene == other.gene && fields.zip(other.fields).forall { case (a, b) => a == b }
}

object HlaAllele {
  private final val Prefix     = "HLA-"
  private final val Separators = "[,;\\s]+"

  /** `HLA-A*02:01` and the bare `A*02:01` a user is likely to paste must parse identically. Genes of
    * other species (`H-2Db`, `Mamu-A*01`) keep their own prefix and so can never collide with a human
    * locus of the same letter. */
  def parse(value: String): Option[HlaAllele] = {
    val trimmed = value.trim.toUpperCase
    val bare    = if (trimmed.startsWith(Prefix)) trimmed.substring(Prefix.length) else trimmed
    bare.split('*').toList match {
      case gene :: rest if gene.nonEmpty =>
        Some(HlaAllele(gene, rest.headOption.toList.flatMap(_.split(':').toList).filter(_.nonEmpty).take(2)))
      case _ => None
    }
  }

  /** VDJdb packs several alleles into a single cell (`HLA-A*02,HLA-A*02:01`), and a donor typing gets
    * pasted with any mix of commas, semicolons and newlines — accept all of it, drop what will not
    * parse. */
  def parseAll(value: String): Seq[HlaAllele] =
    value.split(Separators).toList.flatMap(parse)

  /** True when an `mhc.a`/`mhc.b` cell names any allele this donor carries.
    *
    * A cell that is not an HLA allele at all — `B2M` on every MHC-I record, or the murine `H-2Db` —
    * simply never matches, which is the behaviour we want: filtering by a human donor typing must not
    * quietly pull in mouse records.
    */
  def matches(cell: String, donor: Seq[HlaAllele]): Boolean =
    donor.nonEmpty && parseAll(cell).exists(record => donor.exists(_.compatibleWith(record)))

  /** The HLA loci named by a cell, e.g. `HLA-DRB1*04:01` -> `DRB1`.
    *
    * Deliberately requires the `HLA-` prefix, which in this database is exactly what separates human
    * alleles from `B2M`, `H-2Db`, `I-Ab` and `Mamu-A*01` — so a locus breakdown stays a breakdown of
    * HLA and nothing else.
    */
  def loci(cell: String): Seq[String] =
    cell.split(Separators).toList
      .map(_.trim.toUpperCase)
      .filter(_.startsWith(Prefix))
      .flatMap(parse)
      .map(_.gene)
}

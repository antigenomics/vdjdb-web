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

import java.io.{File, FileInputStream, InputStream}

import backend.server.annotations.api.filters.{AnnotationsDatabaseQueryParams, AnnotationsSearchScope, AnnotationsSearchScopeHammingDistance}
import backend.server.database.Database
import org.slf4j.LoggerFactory

import scala.collection.mutable
import scala.io.Source
import scala.util.Try

/** How reachable each epitope is by chance, measured against a healthy control repertoire.
  *
  * This is the null the enrichment p-values are read against, and it exists because the obvious null
  * is wrong. Scoring an epitope by its share of VDJdb records asks "how much of the database is this
  * epitope", which says nothing about how easy it is to hit: `YLEPGPVTA` holds 11 human TRB records
  * and a random 100k repertoire reaches it 217 times, while `EPLPQGQLTAY` holds 39 and is reached 42
  * times. Under record counts the first looks five times rarer than the second; in a repertoire it is
  * five times commoner. Measured on production, the record-count null gave a *synthetic* repertoire
  * with no immunological history the same epitope profile as two real donors, to within a couple of
  * percent — it was scoring the shape of the database rather than anything about the sample.
  *
  * So the rate comes from a control repertoire instead, and because that rate is itself an estimate
  * from a finite control it enters as a Beta rather than as a fixed number, making the test
  * Beta-Binomial. See `Statistics.betaBinomialUpperTail` on the client, which consumes the two
  * coefficients this produces.
  *
  * ==Pseudocount==
  *
  * Jeffreys, `alpha = matched + 1/2`, `beta = control - matched + 1/2`. It is what makes the rare tail
  * safe in both directions. An epitope reached zero times out of 100,000 has no maximum-likelihood
  * rate other than exactly zero, under which a single match in a donor is infinitely surprising and
  * every such epitope tops the chart; the half-count instead says "somewhere below 1 in 100,000",
  * which is what the measurement actually supports. It also means an epitope absent from the table
  * needs no special case — it is simply one that was never reached, and [[Population.betaFor]] hands
  * back the same floor for it.
  *
  * ==Provenance==
  *
  * Generated offline by `backend.tools.ControlPriorGeneratorSpec` and read here; nothing is computed
  * per request, and nothing is computed at boot beyond parsing ~10k lines. The measurement is a full
  * annotation run of four 100k-clonotype control repertoires against every scope, which takes minutes
  * and needs data that does not belong in this repository. It has to be regenerated whenever VDJdb is
  * updated, because both halves of every ratio it feeds are counted over that database — see
  * `SOURCES.md`.
  *
  * The table is looked for beside the database first and on the classpath second. The database is a
  * bind mount that is updated independently of the image, so whoever refreshes it drops the matching
  * prior next to it; the copy in `conf/` is the one the image was built with, and is the fallback.
  */
object ControlPrior {

  private final val logger = LoggerFactory.getLogger(this.getClass)

  private final val FileName = "control-prior.txt"

  /** Jeffreys. Half a count on each side of the Beta — see the class comment. */
  private final val Pseudocount: Double = 0.5

  /** One (species, gene, scope) population of the table. */
  final case class Population(matched: Map[String, Int], controlSize: Long) {

    /** `(alpha, beta)` for one epitope. Total: an epitope the control never reached gets the floor
      * rather than nothing, which is the whole point of the pseudocount. */
    def betaFor(epitope: String): (Double, Double) = {
      val hits = matched.getOrElse(epitope, 0)
      (hits + Pseudocount, math.max(0L, controlSize - hits) + Pseudocount)
    }
  }

  /** Keyed on the database location, and loaded at most once per location for the life of the
    * process — the same shape as the search-index cache next door, and for the same reason: the table
    * is a property of the database, not of a request. */
  private val loaded = mutable.HashMap.empty[String, Map[String, Population]]

  /** Everything a request has to leave alone for the prior to describe it.
    *
    * The control repertoires were annotated under one configuration, and a p-value read against a
    * differently-filtered search is not conservative — it is wrong in an unknown direction. Turning on
    * a motif filter removes a third of the database, so the control's reach was measured over records
    * the request will never see; V/J matching narrows every neighbourhood; an HLA restriction throws
    * away most of the epitopes outright. None of these is recoverable from the table, so the honest
    * answer is no p-value at all.
    *
    * The values below are exactly the defaults `AnnotationsFilters` ships, which is what makes this
    * worth having rather than a permanent "unavailable": a user who does not touch the filter panel
    * gets p-values, and one who does is told why they went away.
    */
  def measuredUnder(parameters: AnnotationsDatabaseQueryParams, scope: AnnotationsSearchScope): Boolean =
    parameters.mhc == IntersectionTable.BothMhcClasses &&
      parameters.hla.forall(_.trim.isEmpty) &&
      !parameters.inTcrempMotif.contains(true) &&
      !parameters.inTcrnetMotif.contains(true) &&
      !parameters.independentValidationOnly.contains(true) &&
      parameters.minConfidenceScore.contains(1) &&
      !scope.matchV && !scope.matchJ

  /** The Beta coefficients for a request, as `epitope -> (alpha, beta)`.
    *
    * `None` for every epitope when the request is filtered differently from the control run, or when
    * the table holds no rows for this species and chain — both mean "not measured", and the client
    * renders no p-value rather than a number nothing stands behind.
    */
  def betaFor(database: Database, parameters: AnnotationsDatabaseQueryParams,
              scope: AnnotationsSearchScope): String => Option[(Double, Double)] = {
    if (!measuredUnder(parameters, scope)) {
      _ => None
    } else {
      val key = populationKey(parameters.species, parameters.gene,
        AnnotationsSearchScopeHammingDistance.priorName(scope.hammingDistance))
      forDatabase(database).get(key) match {
        case Some(population) => (epitope: String) => Some(population.betaFor(epitope))
        case None             => _ => None
      }
    }
  }

  private def populationKey(species: String, gene: String, scope: String): String =
    s"${species.toLowerCase}|${gene.toLowerCase}|$scope"

  private def forDatabase(database: Database): Map[String, Population] = synchronized {
    loaded.getOrElseUpdate(database.getLocation, read(database.getLocation))
  }

  private def read(databaseLocation: String): Map[String, Population] = {
    val beside = new File(databaseLocation, FileName)
    val stream: Option[(String, InputStream)] =
      if (beside.isFile) {
        Some(beside.getAbsolutePath -> new FileInputStream(beside))
      } else {
        Option(getClass.getResourceAsStream("/" + FileName)).map(s => s"classpath:/$FileName" -> s)
      }

    stream match {
      case None =>
        logger.warn(s"No $FileName beside the database or on the classpath - enrichment p-values are disabled")
        Map.empty
      case Some((origin, in)) =>
        val table = Try(parse(in)).recover {
          case e: Exception =>
            logger.error(s"Could not read the control prior from $origin - enrichment p-values are disabled", e)
            Map.empty[String, Population]
        }.get
        try in.close() catch { case _: Exception => }
        logger.info(s"Control prior loaded from $origin: ${table.size} populations, " +
          s"${table.values.map(_.matched.size).sum} epitopes")
        table
    }
  }

  /** `species  gene  scope  epitope  matched  control`, tab separated, with a header.
    *
    * Unparseable rows are dropped rather than failing the load. A truncated or half-written table
    * costs the p-values it cannot describe and nothing else; refusing to boot over it would take the
    * whole annotate page down for a decoration.
    */
  private def parse(in: InputStream): Map[String, Population] = {
    val accumulator = mutable.HashMap.empty[String, (mutable.HashMap[String, Int], Long)]

    Source.fromInputStream(in, "UTF-8").getLines().drop(1).foreach { line =>
      val fields = line.split("\t", -1)
      if (fields.length >= 6) {
        for (matched <- Try(fields(4).trim.toInt).toOption; control <- Try(fields(5).trim.toLong).toOption
             if control > 0) {
          val key = populationKey(fields(0).trim, fields(1).trim, fields(2).trim)
          val (epitopes, _) = accumulator.getOrElseUpdate(key, (mutable.HashMap.empty[String, Int], control))
          epitopes(fields(3)) = matched
        }
      }
    }

    accumulator.map { case (key, (epitopes, control)) => key -> Population(epitopes.toMap, control) }.toMap
  }
}

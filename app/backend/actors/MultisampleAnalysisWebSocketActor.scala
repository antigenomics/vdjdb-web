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

package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.{User, UserDetails}
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.SampleFileProvider
import backend.models.usage.UsageProvider
import backend.server.annotations.{AnnotationsBusyException, AnnotationsScheduler, ControlPrior, IntersectionTable, SearchSummary}
import backend.server.annotations.api.multisample.summary.{MultisampleSummaryAnalysisRequest, MultisampleSummaryAnalysisResponse}
import backend.server.annotations.charts.summary.SummaryCounters
import backend.server.database.Database
import backend.server.motifs.Motifs
import backend.server.limit.{IpLimit, RequestLimits}
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import org.slf4j.LoggerFactory
import play.api.libs.json.JsValue

import scala.async.Async.{async, await}
import scala.collection.JavaConverters._
import scala.concurrent.ExecutionContext
import scala.util.control.NonFatal
import scala.util.{Failure, Success}

class MultisampleAnalysisWebSocketActor(out: ActorRef, limit: IpLimit, user: User, details: UserDetails,
                                        database: Database, motifs: Motifs, usage: UsageProvider,
                                        scheduler: AnnotationsScheduler)
                                       (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
                                        upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider)
  extends WebSocketActor(out, limit) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  private final val connection: String = self.path.toString

  def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
    out.getAction match {
      case MultisampleSummaryAnalysisResponse.Action =>
        // Same daily allowance as the single-sample annotate handler, and for the same reason: this
        // searches every selected sample against the whole database, so it is at least as expensive
        // and usually several times over. Without the check here the quota on the other handler is decorative —
        // the same account annotates without limit through this tab instead. One request costs one
        // unit, not one per selected sample: the ceiling is on jobs a person asks for.
        usage.checkAnnotate(user, details.permissions) match {
          case Some(message) =>
            out.errorMessage(message)
          case None =>
            validateData(out, data, (request: MultisampleSummaryAnalysisRequest) => async {
              val tabID = request.tabID
              val userFiles = await(user.getSampleFilesWithMetadata)
              val userFilesNames = userFiles.map(_._1.sampleName)
              val selected = request.sampleNames.filter(userFilesNames.contains)

              // One scheduler slot for the whole request, not one per sample. The samples used to be
              // loaded and searched concurrently, so a single user selecting ten of them asked for ten
              // times the parallelism of a single-sample annotation — the heaviest thing the app can
              // be told to do, and the one that most needed a ceiling. They now run one after another
              // inside that slot.
              scheduler.submit(connection,
                position => out.success(MultisampleSummaryAnalysisResponse.QueuedState(tabID, position))) {
                val (index, summaryIndex) = IntersectionTable.indexesFor(
                  database, request.databaseQueryParams, request.searchScope, request.scoring)

                // Every filter the panel offers, the same set the single-sample tab applies. This tab
                // used to stop at `databaseRestrictions` - species, gene, MHC class, confidence, V/J -
                // and silently drop the rest, so a donor HLA typed into the panel narrowed a single
                // sample's matches and did nothing at all to "All samples". Two tabs reading one panel
                // and honouring different halves of it is not a defensible default, whichever half is
                // missing.
                val restrictions = IntersectionTable.databaseRestrictions(request.databaseQueryParams, request.searchScope) ++
                  IntersectionTable.postSearchFilters(request.databaseQueryParams, motifs)

                // Hoisted out of the per-sample loop for the same reason the index is: the prior is a
                // property of the database and of this request's filters, and every sample in the
                // selection is scored against the same one.
                val prior = ControlPrior.betaFor(database, request.databaseQueryParams, request.searchScope)

                val multipleSummary = selected.flatMap { sampleName =>
                  val file = userFiles.find(_._1.sampleName == sampleName).get
                  try {
                    val sample = new SampleFileConnection(file._2.path, Software.valueOf(file._1.software)).getSample
                    out.success(MultisampleSummaryAnalysisResponse.ParseState(tabID, sampleName))

                    val results = index.search(sample)
                    out.success(MultisampleSummaryAnalysisResponse.AnnotateState(tabID, sampleName))

                    // The denominators come from the index built alongside the database. This loop is
                    // why that matters most here: `ClonotypeSearchSummary` recomputed them from
                    // scratch for every sample in the selection, so a ten-sample analysis paid the
                    // same ~45 second database scan ten times over.
                    val found = results.asScala.toList
                      .map { case (c, l) => (c, l.asScala.toList.filter(hit => restrictions.forall(allows => allows(c, hit)))) }
                      .filter { case (_, hits) => hits.nonEmpty }
                    val (fieldCounters, notFound) =
                      SearchSummary.summarize(found, sample, IntersectionTable.SummaryFields, summaryIndex, prior)
                    val annotated = IntersectionTable.summarizeAnnotated(found)
                    Some(sampleName -> SummaryCounters(fieldCounters, notFound, annotated))
                  } catch {
                    // One unreadable sample must not lose the other nine, which is what the previous
                    // `filter(_.isSuccess)` achieved — silently. Same outcome, now with a reason in
                    // the log.
                    case NonFatal(e) =>
                      logger.error(s"Multisample analysis failed for sample '$sampleName'", e)
                      None
                  }
                }.toMap

                out.success(MultisampleSummaryAnalysisResponse.CompletedState(tabID, multipleSummary))
              } onComplete {
                case Failure(AnnotationsBusyException(message)) => out.errorMessage(message)
                case Failure(t) =>
                  logger.error("Multisample analysis failed", t)
                  out.errorMessage("Unable to analyse these samples")
                case Success(_) =>
              }
            })
        }
      case _ =>
        out.errorMessage("Invalid action")
    }
  }
}

object MultisampleAnalysisWebSocketActor {
  def props(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database, motifs: Motifs,
            usage: UsageProvider, scheduler: AnnotationsScheduler)
           (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
            upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider): Props =
    Props(new MultisampleAnalysisWebSocketActor(out, limit, user, details, database, motifs, usage, scheduler))
}
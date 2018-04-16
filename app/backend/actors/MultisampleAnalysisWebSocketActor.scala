/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

package backend.actors

import java.util

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.{User, UserDetails}
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.SampleFileProvider
import backend.server.annotations.api.multisample.summary.{MultisampleSummaryAnalysisRequest, MultisampleSummaryAnalysisResponse}
import backend.server.annotations.charts.summary.{SummaryClonotypeCounter, SummaryCounters, SummaryFieldCounter}
import backend.server.database.Database
import backend.server.limit.{IpLimit, RequestLimits}
import com.antigenomics.vdjdb.impl.ScoringBundle
import com.antigenomics.vdjdb.impl.filter.DummyResultFilter
import com.antigenomics.vdjdb.impl.weights.{DegreeWeightFunctionFactory, DummyWeightFunctionFactory}
import com.antigenomics.vdjdb.sequence.SearchScope
import com.antigenomics.vdjdb.stat.ClonotypeSearchSummary
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import play.api.libs.json.JsValue

import scala.collection.JavaConverters._
import scala.concurrent.{ExecutionContext, Future}
import scala.async.Async.{async, await}
import scala.util.{Failure, Success}

class MultisampleAnalysisWebSocketActor(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
                                       (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
                                        upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider)
    extends WebSocketActor(out, limit) {

    private def lift[T](futures: Seq[Future[T]]) = futures.map(_.map { Success(_) }.recover { case t => Failure(t) })
    private def waitAll[T](futures: Seq[Future[T]]) = Future.sequence(lift(futures))

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case MultisampleSummaryAnalysisResponse.Action =>
                validateData(out, data, (request: MultisampleSummaryAnalysisRequest) => async {
                    val tabID = request.tabID
                    val userFiles = await(user.getSampleFilesWithMetadata)
                    val userFilesNames = userFiles.map(_._1.sampleName)
                    val samples = request.sampleNames.filter(userFilesNames.contains(_)).map((sampleName) => async {
                        val file = userFiles.find(_._1.sampleName == sampleName)
                        val sampleFileConnection = new SampleFileConnection(file.get._2.path, Software.valueOf(file.get._1.software))
                        val sample = sampleFileConnection.getSample
                        out.success(MultisampleSummaryAnalysisResponse.ParseState(tabID, file.get._1.sampleName))
                        (sampleName, sample)
                    })

                    val scope = request.hammingDistance match {
                        case 0 => new SearchScope(0, 0, 0, 0)
                        case 1 => new SearchScope(1, 0, 0, 1)
                        case 2 => new SearchScope(2, 0, 0, 2)
                        case 3 => new SearchScope(3, 0, 0, 3)
                        case _ => new SearchScope(0, 0, 0, 0)
                    }
                    val filters = new util.ArrayList[TextFilter]()
                    if (request.mhc != "MHCI+II") {
                        filters.add(new ExactTextFilter("mhc.class", request.mhc, false))
                    }

                    val instance = database.getInstance.filter(filters)
                        .asClonotypeDatabase(request.species, request.gene, scope,
                            ScoringBundle.getDUMMY, DegreeWeightFunctionFactory.DEFAULT, DummyResultFilter.INSTANCE,
                            request.matchV, request.matchJ, request.confidenceThreshold, request.minEpitopeSize)

                    val counters = samples.map((futureSample) => async {
                        val sample = await(futureSample)
                        val results = instance.search(sample._2)
                        out.success(MultisampleSummaryAnalysisResponse.AnnotateState(tabID, sample._1))

                        val summary = new ClonotypeSearchSummary(results, sample._2, ClonotypeSearchSummary.FIELDS_STARBURST, instance)
                        val counters = summary.fieldCounters.asScala.map { case (name, map) =>
                            SummaryFieldCounter(name, map.asScala.filter(v => v._2.getUnique != 0).map { case (field, value) =>
                                SummaryClonotypeCounter(field, value.getUnique, value.getDatabaseUnique, value.getFrequency)
                            }.toSeq)
                        }.toSeq

                        val nfc = summary.getNotFoundCounter
                        (sample._1, SummaryCounters(counters, SummaryClonotypeCounter("notFound", nfc.getUnique, nfc.getDatabaseUnique, nfc.getFrequency)))
                    })

                    val multipleSummary = await(waitAll(counters).map { completedJobs =>
                        completedJobs.filter(_.isSuccess).map((completedFuture) => completedFuture.get._1 -> completedFuture.get._2)
                    }).toMap

                    out.success(MultisampleSummaryAnalysisResponse.CompletedState(tabID, multipleSummary))
                })
            case _ =>
                out.errorMessage("Invalid action")
        }
    }
}

object MultisampleAnalysisWebSocketActor {
    def props(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
              upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider): Props =
        Props(new MultisampleAnalysisWebSocketActor(out, limit, user, details, database))
}
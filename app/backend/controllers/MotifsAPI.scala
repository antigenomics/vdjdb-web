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

package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.server.limit.RequestLimits
import backend.server.motifs.Motifs
import backend.server.motifs.api.cdr3.MotifCDR3SearchRequest
import backend.server.motifs.api.export.{ClusterMembersExportRequest, ClusterMembersExportResponse}
import backend.server.motifs.api.filter.MotifsSearchTreeFilter
import javax.inject._
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.libs.json.JsError
import play.api.libs.json.Json.toJson
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class MotifsAPI @Inject()(cc: ControllerComponents, motifs: Motifs, configuration: Configuration)
                         (implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits)
  extends AbstractController(cc) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  def getMetadata(method: Option[String]): Action[AnyContent] = Action.async {
    Future.successful {
      Ok(toJson(motifs.getMetadata(method)))
    }
  }

  def filter: Action[AnyContent] = Action.async { implicit request =>
    request.body.asJson.map { json =>
      json.validate[MotifsSearchTreeFilter].fold(
        errors => {
          // The JSON paths that failed validation say nothing to the person who clicked the tree; they
          // belong in the log, where they are actually diagnostic.
          logger.warn("Malformed motif filter request: " + JsError.toJson(errors))
          Future.successful(BadRequest("The motif selection could not be read. Please reload the page and pick the epitope again."))
        },
        filter => {
          motifs.filter(filter).map {
            case Some(result) => Ok(toJson(result))
            case None         => NotFound("No results found for this filter")
          } recover {
            case t: Throwable =>
              // printStackTrace wrote straight to stderr, so this never reached application.log at all -
              // no timestamp, no logger name, and nothing left on the box once the console scrolled away.
              logger.error("Failed to compute motifs for filter", t)
              InternalServerError("Motifs could not be loaded for this selection. Please try again; if it keeps failing, report it on the VDJdb-web issue tracker.")
          }
        }
      )
    }.getOrElse {
      Future.successful(BadRequest("Expecting Json data"))
    }
  }

  def cdr3: Action[AnyContent] = Action.async { implicit request =>
    request.body.asJson.map { json =>
      json.validate[MotifCDR3SearchRequest].map {
        search => motifs.cdr3(search.cdr3, search.substring, search.gene, search.top, search.method).map { r => Ok(toJson(r)) }.recover { case _ => BadRequest("Bad request") }
      }.recoverTotal {
        e =>
          logger.warn("Malformed motif CDR3 search request: " + JsError.toFlatForm(e))
          Future.successful(BadRequest("The CDR3 search could not be read. Please check the sequence and the selected gene, then search again."))
      }
    }.getOrElse {
      Future.successful(BadRequest("Expecting Json data"))
    }
  }

  def members: Action[AnyContent] = Action.async { implicit request =>
    request.body.asJson.map { json =>
      json.validate[ClusterMembersExportRequest].map {
        export =>
          motifs.members(export.cid, export.format, export.method).map(_.map(link =>
            Ok(toJson(ClusterMembersExportResponse(link.getDownloadLink))))
          ).getOrElse(Future.successful(BadRequest("Invalid format provided")))
      }.recoverTotal {
        e =>
          logger.warn("Malformed cluster members export request: " + JsError.toFlatForm(e))
          Future.successful(BadRequest("The export request could not be read. Please reopen the cluster and start the export again."))
      }
    }.getOrElse {
      Future.successful(BadRequest("Expecting Json data"))
    }
  }

}

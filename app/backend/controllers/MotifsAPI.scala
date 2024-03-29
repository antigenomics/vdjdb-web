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
import play.api.Configuration
import play.api.libs.json.JsError
import play.api.libs.json.Json.toJson
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class MotifsAPI @Inject()(cc: ControllerComponents, motifs: Motifs, configuration: Configuration)
                         (implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits)
  extends AbstractController(cc) {

  def getMetadata: Action[AnyContent] = Action.async {
    Future.successful {
      Ok(toJson(motifs.getMetadata))
    }
  }

  def filter: Action[AnyContent] = Action.async { implicit request =>
    Future.successful {
      request.body.asJson.map { json =>
        json.validate[MotifsSearchTreeFilter].map {
          filter => motifs.filter(filter).map { r => Ok(toJson(r)) }.getOrElse(BadRequest("Invalid filter provided"))
        }.recoverTotal {
          e => BadRequest("Detected error:" + JsError.toFlatForm(e))
        }
      }.getOrElse {
        BadRequest("Expecting Json data")
      }
    }
  }

  def cdr3: Action[AnyContent] = Action.async { implicit request =>
    request.body.asJson.map { json =>
      json.validate[MotifCDR3SearchRequest].map {
        search => motifs.cdr3(search.cdr3, search.substring, search.gene, search.top).map { r => Ok(toJson(r)) }.recover { case _ => BadRequest("Bad request") }
      }.recoverTotal {
        e => Future.successful(BadRequest("Detected error:" + JsError.toFlatForm(e)))
      }
    }.getOrElse {
      Future.successful(BadRequest("Expecting Json data"))
    }
  }

  def members: Action[AnyContent] = Action.async { implicit request =>
    request.body.asJson.map { json =>
      json.validate[ClusterMembersExportRequest].map {
        export =>
          motifs.members(export.cid, export.format).map(_.map(link =>
            Ok(toJson(ClusterMembersExportResponse(link.getDownloadLink))))
          ).getOrElse(Future.successful(BadRequest("Invalid format provided")))
      }.recoverTotal {
        e => Future.successful(BadRequest("Detected error:" + JsError.toFlatForm(e)))
      }
    }.getOrElse {
      Future.successful(BadRequest("Expecting Json data"))
    }
  }

}

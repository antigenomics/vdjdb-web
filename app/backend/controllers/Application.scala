/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.controllers

import java.io.File

import javax.inject._
import backend.actions.{BrowserDetectionAction, SessionAction, UserRequestAction}
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.files.temporary.TemporaryFileProvider
import backend.utils.analytics.Analytics
import buildinfo.BuildInfo
import controllers._
import play.api._
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.libs.json.Json
import play.api.libs.ws._
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class Application @Inject()(ws: WSClient, assets: Assets, configuration: Configuration, cc: ControllerComponents, browserDetectionAction: BrowserDetectionAction,
                            userRequestAction: UserRequestAction, tfp: TemporaryFileProvider, up: UserProvider, messagesApi: MessagesApi)
                           (implicit environment: Environment, analytics: Analytics, stp: SessionTokenProvider, ec: ExecutionContext) extends AbstractController(cc) {
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))
    private final val cacheControlTimeout: Int = 3600 //seconds

    def index: Action[AnyContent] = (browserDetectionAction andThen userRequestAction) { implicit request =>
        SessionAction.updateCookies(Ok(frontend.views.html.index()))
    }

    def onNoScript: Action[AnyContent] = (browserDetectionAction andThen userRequestAction) { implicit request =>
        SessionAction.updateCookies(Ok(frontend.views.html.noScript()))
    }

    def robots: Action[AnyContent] = {
        assets.at(path = "/public", "seo/robots.txt")
    }

    def buildInfo: Action[AnyContent] = Action.async {
        Future.successful {
            Ok(Json.parse(BuildInfo.toJson))
        }
    }

    def authorizedIndex(route: String): Action[AnyContent] = (browserDetectionAction andThen userRequestAction andThen SessionAction.authorizedOnly) { implicit request =>
        SessionAction.updateCookies(Ok(frontend.views.html.index()))
    }

    def angular(file: String, cache: Boolean): Action[AnyContent] = externalServer(file, cache, ":4200/develop/angular/")

    def externalServer(file: String, cache: Boolean, path: String): Action[AnyContent] = if (environment.mode == Mode.Dev) Action.async { implicit request =>
        ws.url(s"http://localhost$path/$file").get().map { response =>
            val contentType = response.headers.get("Content-Type").flatMap(_.headOption).getOrElse("application/octet-stream")
            var headers = response.headers.toSeq.map(p => (p._1, p._2.mkString))
            if (cache) {
                headers = headers ++: Seq(("Cache-Control", s"private, max-age=$cacheControlTimeout"))
            } else {
                headers = headers ++: Seq(("Cache-Control", s"no-cache, no-store, must-revalidate"))
            }
            Ok(response.body).withHeaders(headers: _*).as(contentType)
        }
    } else {
        Action.apply(BadRequest(""))
    }

    def downloadTemporaryFile(link: String): Action[AnyContent] = Action.async { implicit request =>
        tfp.getWithMetadata(link).flatMap {
            case Some((_, metadata)) =>
                val file = new File(metadata.path)
                Future.successful {
                    Ok.sendFile(file, inline = false, _ => metadata.getNameWithDateAndExtension, () => {
                        tfp.deleteTemporaryFile(link)
                    })
                }
            case None => Future.failed(new Exception("File not found"))
        }
    }
}

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

import java.io.File

import backend.actions.{BrowserDetectionAction, SessionAction, UserRequestAction}
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.files.temporary.TemporaryFileProvider
import backend.utils.analytics.Analytics
import buildinfo.BuildInfo
import controllers._
import javax.inject._
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

  /** The SPA shell must revalidate on every load.
    *
    * It was served with no cache directives at all - no Cache-Control, no ETag, no Last-Modified - so
    * browsers fell back to heuristic caching and could hold a stale index.html indefinitely. The
    * bundles it references are content-hashed and the old ones are still on disk, so a stale shell
    * loads a stale application perfectly happily: the user runs the previous release's JavaScript
    * against the current server until they think to hard-reload.
    *
    * That is how a deploy turns into "the Browse tab is stuck" - the shell predates a navbar change,
    * so its Browse item is wired the old way and clicking it does nothing.
    *
    * Only the shell. The hashed assets under /assets stay cacheable, which is the whole point of
    * hashing them.
    */
  private final val ShellCacheControl: String = "no-cache, no-store, must-revalidate"

  def index: Action[AnyContent] = (browserDetectionAction andThen userRequestAction) { implicit request =>
    SessionAction.updateCookies(Ok(frontend.views.html.index()))
      .withHeaders(CACHE_CONTROL -> ShellCacheControl)
  }

  def onNoScript: Action[AnyContent] = (browserDetectionAction andThen userRequestAction) { implicit request =>
    SessionAction.updateCookies(Ok(frontend.views.html.noScript()))
      .withHeaders(CACHE_CONTROL -> ShellCacheControl)
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
      .withHeaders(CACHE_CONTROL -> ShellCacheControl)
  }

  def angular(file: String, cache: Boolean): Action[AnyContent] = externalServer(file, cache, ":4200/develop/angular/")

  def externalServer(file: String, cache: Boolean, path: String): Action[AnyContent] = if (environment.mode == Mode.Dev) Action.async { implicit request =>
    ws.url(s"http://localhost$path/$file").get().map { response =>
      val contentType = response.headers.get("Content-Type").flatMap(_.headOption).getOrElse("application/octet-stream")
      var headers = response.headers
        .toSeq.filter(p =>
        List("Content-Type", "Content-Length")
          .indexOf(p._1) < 0)
        .map(p => (p._1, p._2.mkString))
      if (cache) {
        headers = headers ++: Seq(("Cache-Control", s"private, max-age=$cacheControlTimeout"))
      } else {
        headers = headers ++: Seq(("Cache-Control", s"no-cache, no-store, must-revalidate"))
      }
      Ok(response.bodyAsBytes).withHeaders(headers: _*).as(contentType)
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

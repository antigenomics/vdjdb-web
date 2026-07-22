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

import backend.utils.analytics.Analytics
import javax.inject._
import play.api._
import play.api.http.DefaultHttpErrorHandler
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc.Results._
import play.api.mvc._
import play.api.routing.Router
import play.twirl.api.Html

import scala.concurrent._

@Singleton
class ErrorsHandler @Inject()(config: Configuration, sourceMapper: OptionalSourceMapper, router: Provider[Router], messagesApi: MessagesApi)
                             (implicit environment: Environment, analytics: Analytics)
  extends DefaultHttpErrorHandler(environment, config, sourceMapper, router) {
  implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

  /** The exception never reaches the browser.
    *
    * It used to: the body was literally "A server error occurred: " + getMessage, so whatever the failing
    * layer happened to say - a class name, a filesystem path, a fragment of a failing SQL statement -
    * was handed to whoever triggered it, as plain text, in production.
    *
    * The detail is already on disk. DefaultHttpErrorHandler.onServerError logs the exception with its
    * full stack trace before delegating here, tagged with the same id we print below, so quoting that id
    * in a bug report is enough to find the trace. The page itself is rendered through the same shell as
    * the 404 so that a failure still looks like the site rather than a bare browser error page.
    */
  override def onProdServerError(request: RequestHeader, exception: UsefulException): Future[Result] = {
    Future.successful {
      InternalServerError(frontend.views.html.main("VDJdb: server error")(Html(
        s"""<div class="ui middle aligned center aligned notfound grid">
           |    <div class="column">
           |        <div class="ui raised segment very padded">
           |            <div class="ui grid">
           |                <div class="six wide column">
           |                    <h1 class="error-header">500</h1>
           |                </div>
           |                <div class="ten wide column left aligned">
           |                    <h2>Something went wrong on our side.</h2>
           |                    <p>We could not complete your request. Please try again in a few moments.</p>
           |                    <p>If it keeps happening, please report it on the
           |                        <a href="https://github.com/antigenomics/vdjdb-web/issues" target="_blank" rel="noopener">VDJdb-web issue tracker</a>
           |                        and quote reference <code>${exception.id}</code>.</p>
           |                    <a href="${backend.controllers.routes.Application.index().url}" class="ui button">Back to home.</a>
           |                </div>
           |            </div>
           |        </div>
           |    </div>
           |</div>""".stripMargin)))
    }
  }

  override def onForbidden(request: RequestHeader, message: String): Future[Result] = {
    Future.successful {
      Forbidden("You're not allowed to access this resource.")
    }
  }

  override def onNotFound(request: RequestHeader, message: String): Future[Result] = {
    Future.successful {
      Ok(frontend.views.html.notFound())
    }
  }
}
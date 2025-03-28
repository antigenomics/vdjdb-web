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

import scala.concurrent._

@Singleton
class ErrorsHandler @Inject()(config: Configuration, sourceMapper: OptionalSourceMapper, router: Provider[Router], messagesApi: MessagesApi)
                             (implicit environment: Environment, analytics: Analytics)
  extends DefaultHttpErrorHandler(environment, config, sourceMapper, router) {
  implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

  override def onProdServerError(request: RequestHeader, exception: UsefulException): Future[Result] = {
    Future.successful {
      InternalServerError("A server error occurred: " + exception.getMessage)
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
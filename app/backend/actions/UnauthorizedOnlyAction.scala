/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.actions
import javax.inject.Inject

import backend.models.authorization.user.UserProvider
import play.api.mvc._
import scala.concurrent.{ExecutionContext, Future}

class UnauthorizedOnlyAction @Inject()(parser: BodyParsers.Default)(implicit ec: ExecutionContext, up: UserProvider) extends ActionBuilderImpl(parser) {
    override def invokeBlock[A](request: Request[A], block: Request[A] => Future[Result]): Future[Result] = {
        up.getBySessionToken(request.session.get(up.getAuthTokenSessionName).getOrElse("")) flatMap { user =>
            if (user.nonEmpty) {
                Future.successful(Results.Redirect(backend.controllers.routes.Application.index()))
            } else {
                block(request)
            }
        }
    }
}


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
 */

package backend.actions

import javax.inject.Inject

import backend.models.authorization.session.{SessionToken, SessionTokenProvider}
import backend.models.authorization.user.{User, UserProvider}
import play.api.mvc._

import scala.async.Async.await
import scala.concurrent.{ExecutionContext, Future}

class UserRequest[A](val authorized: Boolean, val user: Option[User], val token: Option[SessionToken], request: Request[A])
    extends WrappedRequest[A](request)

class UserRequestAction @Inject()(val parser: BodyParsers.Default)
                                 (implicit val executionContext: ExecutionContext, stp: SessionTokenProvider, up: UserProvider)
    extends ActionBuilder[UserRequest, AnyContent] with ActionTransformer[Request, UserRequest] {

    def transform[A](request: Request[A]): Future[UserRequest[A]] = scala.async.Async.async {
        val requestSessionToken = request.session.get(up.getAuthTokenSessionName)
        if (requestSessionToken.isEmpty) {
            new UserRequest(false, None, None, request)
        } else {
            val token = await(stp.get(requestSessionToken.get))
            if (token.isEmpty) {
                new UserRequest(false, None, None, request)
            } else {
                new UserRequest(true, await(up.get(token.get.userID)), token, request)
            }
        }
    }
}
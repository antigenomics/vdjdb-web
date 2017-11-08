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

package backend.server.session

import javax.inject.{Inject, Singleton}

import akka.stream.Materializer
import backend.models.authorization.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import play.api.mvc._

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class SessionGuard @Inject()(userProvider: UserProvider, sessionTokenProvider: SessionTokenProvider)
                            (implicit val mat: Materializer, ec: ExecutionContext) extends Filter {
    override def apply(nextFilter: (RequestHeader) => Future[Result])(request: RequestHeader): Future[Result] = async {
        val sessionToken = await(sessionTokenProvider.get(request.session.get(sessionTokenProvider.getAuthTokenSessionName).getOrElse("")))
        if (sessionToken.nonEmpty) {
            val user = await(userProvider.get(sessionToken.get.userID))
            await(nextFilter(request).map { result =>
                result
                    .withSession(request.session + (sessionTokenProvider.getAuthTokenSessionName, sessionToken.get.token))
                    .withCookies(
                        Cookie("logged", "true", httpOnly = false),
                        Cookie("email", user.get.email, httpOnly = false),
                        Cookie("login", user.get.login, httpOnly = false))
            })
        } else {
            await(nextFilter(request).map { result =>
                result
                    .discardingCookies(DiscardingCookie("logged"))
                    .discardingCookies(DiscardingCookie("email"))
                    .discardingCookies(DiscardingCookie("login"))
            })
        }
    }
}

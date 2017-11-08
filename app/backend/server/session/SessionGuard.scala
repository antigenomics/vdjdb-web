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
class SessionGuard @Inject()(up: UserProvider, stp: SessionTokenProvider)(implicit val mat: Materializer, ec: ExecutionContext) extends Filter {
    override def apply(nextFilter: (RequestHeader) => Future[Result])(request: RequestHeader): Future[Result] = async {
        val jwtToken = request.session.get(stp.getAuthTokenSessionName)
        if (jwtToken.nonEmpty) {
            val sessionToken = await(stp.get(jwtToken.get))
            if (sessionToken.nonEmpty) {
                val user = await(up.get(sessionToken.get.userID))
                await(nextFilter(request).map { result =>
                    result
                        .withSession(request.session + (stp.getAuthTokenSessionName, sessionToken.get.token))
                        .withCookies(
                            Cookie("logged", "true", httpOnly = false),
                            Cookie("email", user.get.email, httpOnly = false),
                            Cookie("login", user.get.login, httpOnly = false))
                })
            } else {
                await(nextFilter(request).map { result =>
                    SessionGuard.discardCookies(result, request)
                })
            }
        } else {
            await(nextFilter(request).map { result =>
                SessionGuard.discardCookies(result, request)
            })
        }
    }
}

object SessionGuard {


    def discardCookies(result: Result, request: RequestHeader): Result = {
        result
            .discardingCookies(DiscardingCookie("logged"))
            .discardingCookies(DiscardingCookie("email"))
            .discardingCookies(DiscardingCookie("login"))
    }

    def clearSessionAndDiscardCookies(result: Result, request: RequestHeader): Result = {
        discardCookies(result, request).withNewSession
    }
}

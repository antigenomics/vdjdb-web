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

import backend.models.authorization.tokens.session.SessionTokenProvider
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

object SessionAction {
    def authorizedOnly(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
        override protected def executionContext: ExecutionContext = ec
        override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
            if (request.authorized) {
                None
            } else {
                Some(Results.Redirect(backend.controllers.routes.Application.index()))
            }
        }
    }

    def unauthorizedOnly(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
        override protected def executionContext: ExecutionContext = ec
        override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
            if (request.authorized) {
                Some(Results.Redirect(backend.controllers.routes.Application.index()))
            } else {
                None
            }
        }
    }

    def updateCookies[A](result: Result)(implicit userRequest: UserRequest[A], stp: SessionTokenProvider): Result = {
        if (userRequest.authorized) {
            result
                .withSession(userRequest.session + (stp.getAuthTokenSessionName, userRequest.token.get.token))
                .withCookies(Cookie("logged", "true", httpOnly = false))
                .withCookies(Cookie("email", userRequest.user.get.email, httpOnly = false))
                .withCookies(Cookie("login", userRequest.user.get.login, httpOnly = false))
        } else {
            SessionAction.clearSessionAndDiscardCookies(result)
        }
    }

    def discardCookies(result: Result): Result = {
        result
            .discardingCookies(DiscardingCookie("logged"))
            .discardingCookies(DiscardingCookie("email"))
            .discardingCookies(DiscardingCookie("login"))
    }

    def clearSessionAndDiscardCookies(result: Result): Result = {
        discardCookies(result).withNewSession
    }
}

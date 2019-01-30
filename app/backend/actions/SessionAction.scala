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

package backend.actions

import java.net.URLEncoder

import backend.models.authorization.tokens.session.SessionTokenProvider
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

object SessionAction {
  final val redirectLoadtion = backend.controllers.routes.Application.index()

  def authorizedOnly(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
    override protected def executionContext: ExecutionContext = ec

    override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
      if (request.authorized) {
        None
      } else {
        Some(Results.Redirect(redirectLoadtion))
      }
    }
  }

  def unauthorizedOnly(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
    override protected def executionContext: ExecutionContext = ec

    override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
      if (request.authorized) {
        Some(Results.Redirect(redirectLoadtion))
      } else {
        None
      }
    }
  }

  def updateCookies[A](result: Result)(implicit userRequest: UserRequest[A], stp: SessionTokenProvider): Result = {
    if (userRequest.authorized) {
      val session = userRequest.session + ((stp.getAuthTokenSessionName, userRequest.token.get.token))
      result
        .withSession(session)
        .withCookies(Cookie("logged", URLEncoder.encode("true", "UTF-8"), httpOnly = false))
        .withCookies(Cookie("email", URLEncoder.encode(userRequest.user.get.email, "UTF-8"), httpOnly = false))
        .withCookies(Cookie("login", URLEncoder.encode(userRequest.user.get.login, "UTF-8"), httpOnly = false))
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

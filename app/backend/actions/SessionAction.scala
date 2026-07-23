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

  /** Where an unauthenticated request to a gated page is sent.
    *
    * Not the home page. Everything behind `authorizedOnly` is reached by a user who has already
    * decided to do something that needs an account - open /annotations, view their account, upload a
    * sample - so answering with the front page is a dead end that explains nothing: the address bar
    * changes, no message appears, and the obvious reading is that the link is broken. This is the same
    * page the navbar's "Login" points at, so the user lands where they can actually continue.
    */
  final val loginLocation = backend.controllers.routes.Authorization.temporaryLogin()

  /** Shown instead of a temporary account's login, which is the raw access token. */
  final val TEMPORARY_USER_DISPLAY_NAME = "Temporary user"

  /** Where an unauthenticated request for the annotation area is sent.
    *
    * A rung below `loginLocation`, not a replacement for it. The account pages and logout are only
    * ever reached by someone who already knows they have an account, so a login form is the whole
    * answer there. /annotations is the opposite: it is linked from the navbar of a public database,
    * and a bare credential prompt does not explain why the one page that asks for a file also asks
    * who you are. That page does, and offers the login as its second button.
    */
  final val annotationSignInLocation = backend.controllers.routes.Authorization.annotationSignIn()

  def authorizedOnly(implicit ec: ExecutionContext): ActionFilter[UserRequest] = authorizedOnlyOr(loginLocation)

  def authorizedOnlyOr(target: Call)(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
    override protected def executionContext: ExecutionContext = ec

    override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
      if (request.authorized) {
        None
      } else {
        Some(Results.Redirect(target))
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
      val updatedResult = result.withSession(session)
        .withCookies(Cookie("logged", URLEncoder.encode("true", "UTF-8"), httpOnly = false))

      // Safely handle user data which might be null even when authorized
      userRequest.user match {
        case Some(user) =>
          // A temporary account's `login` and `email` are both the raw access token, so neither may go
          // into a JS-readable cookie (`login` is also rendered in the navbar). The `email` cookie was
          // only ever read into a logger.debug call, so it is dropped outright.
          val displayLogin = if (user.isTemporary) SessionAction.TEMPORARY_USER_DISPLAY_NAME else user.login
          updatedResult
            .withCookies(Cookie("login", URLEncoder.encode(displayLogin, "UTF-8"), httpOnly = false))
        case None =>
          updatedResult
      }
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

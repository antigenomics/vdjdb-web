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
 *
 */

package backend.actions

import java.net.URLEncoder

import play.api.mvc._
import play.api.test.Helpers._
import play.api.test.FakeRequest

import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}
import scala.language.reflectiveCalls

class SessionActionSpec extends ActionsTestSpec with Results {
    def createResult(filter: ActionFilter[UserRequest], token: String): (Future[Result], UserRequest[_]) = {
        val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> token)
        val userRequest = Await.result(userRequestAction.transform(request), Duration.Inf)

        (filter.invokeBlock(userRequest, { request: UserRequest[_] => Future.successful(Ok) }), userRequest)
    }

    "SessionAction" should {
        "allow to connect for authorized users in authorizedOnly method" taggedAs ActionsTestTag in {
            val result = createResult(SessionAction.authorizedOnly, fixtures.authorizedUser.sessionToken)._1
            status(result) shouldEqual OK
        }

        "not allow to connect for authorized user in unauthorizedOnly method" taggedAs ActionsTestTag in {
            val result = createResult(SessionAction.unauthorizedOnly, fixtures.authorizedUser.sessionToken)._1
            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(SessionAction.redirectLoadtion.url)
        }

        "allow to connect for unauthorized users in unauthorizedOnly method" taggedAs ActionsTestTag in {
            val result = createResult(SessionAction.unauthorizedOnly, "SessionAction#unauthorized")._1
            status(result) shouldEqual OK
        }

        "not allow to connect for unauthorized user in authorizedOnly method" taggedAs ActionsTestTag in {
            val result = createResult(SessionAction.authorizedOnly, "SessionAction#unauthorized")._1
            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(SessionAction.redirectLoadtion.url)
        }

        "update cookies for authorized users" taggedAs ActionsTestTag in {
            val result = createResult(SessionAction.unauthorizedOnly, fixtures.authorizedUser.sessionToken)
            result._1.map { r =>
                implicit val userRequest = result._2
                val updatedResult = Future.successful(SessionAction.updateCookies(r))

                cookies(updatedResult) should contain(Cookie("login", URLEncoder.encode(fixtures.authorizedUser.credentials.login, "UTF-8"), httpOnly = false))
                cookies(updatedResult) should contain(Cookie("email", URLEncoder.encode(fixtures.authorizedUser.credentials.email, "UTF-8"), httpOnly = false))
                cookies(updatedResult) should contain(Cookie("logged", "true", httpOnly = false))
                session(updatedResult).data should contain key (stp.getAuthTokenSessionName)
                session(updatedResult).get(stp.getAuthTokenSessionName).get shouldEqual fixtures.authorizedUser.sessionToken
            }
        }

        "discard cookies for unathorized users" taggedAs ActionsTestTag in {
            val result = createResult(SessionAction.unauthorizedOnly, "SessionAction#unauthorized")
            result._1.map { r =>
                implicit val userRequest = result._2
                val updatedResult = Future.successful(SessionAction.updateCookies(r))

                cookies(updatedResult) should contain (DiscardingCookie("logged").toCookie)
                cookies(updatedResult) should contain (DiscardingCookie("login").toCookie)
                cookies(updatedResult) should contain (DiscardingCookie("email").toCookie)
                session(updatedResult).data should not contain key (stp.getAuthTokenSessionName)
            }
        }
    }

}

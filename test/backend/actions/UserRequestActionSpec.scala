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

import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.BaseTestSpecWithApplication
import play.api.test.FakeRequest
import scala.language.reflectiveCalls
import scala.async.Async.{async, await}
import scala.concurrent.Await
import scala.concurrent.duration.Duration

class UserRequestActionSpec extends BaseTestSpecWithApplication {
    implicit lazy val stp: SessionTokenProvider = app.injector.instanceOf[SessionTokenProvider]
    implicit lazy val up: UserProvider = app.injector.instanceOf[UserProvider]
    implicit lazy val userRequestAction: UserRequestAction = app.injector.instanceOf[UserRequestAction]

    trait VerifiedUser {
        private final val _verificationToken = Await.result(up.createUser("vefifieduser", "verifieduser@mail.com", "verifieduser"), Duration.Inf)
        private final val _verifiedUser = Await.result(up.verifyUser(_verificationToken), Duration.Inf)

        _verifiedUser should not be empty
        _verifiedUser.get.verified shouldEqual true

        final val user = _verifiedUser.get
        final val password = "verifieduser"
    }

    //noinspection TypeAnnotation
    val fixtures = {
        new {
            lazy val verifiedUser: VerifiedUser = new VerifiedUser {}
        }
    }

    "UserRequestAction" should {
        "create authorized action for authorized user" taggedAs ActionsTestTag in {
            async {
                val f = fixtures
                val session = await(stp.createSessionToken(f.verifiedUser.user))
                val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> session)
                val userRequest = await(userRequestAction.transform(request))

                userRequest.authorized shouldEqual true
                userRequest.user should not be empty
                userRequest.user.get.login shouldEqual f.verifiedUser.user.login
                userRequest.user.get.email shouldEqual f.verifiedUser.user.email
                userRequest.user.get.checkPassword(f.verifiedUser.password) shouldEqual true
                userRequest.token should not be empty
                userRequest.token.get.token shouldEqual session
            }
        }

        "create non-authorized action for non-authorized user" taggedAs ActionsTestTag in {
            async {
                val request = FakeRequest()
                    .withSession(stp.getAuthTokenSessionName -> "dummy")
                val userRequest = await(userRequestAction.transform(request))

                userRequest.authorized shouldEqual false
                userRequest.user should be (empty)
                userRequest.token should be (empty)

                val f = fixtures
                val session = await(stp.createSessionToken(f.verifiedUser.user))
                val _ = await(stp.delete(session))

                val request2 = FakeRequest().withSession(stp.getAuthTokenSessionName -> session)
                val userRequest2 = await(userRequestAction.transform(request2))

                userRequest2.authorized shouldEqual false
                userRequest2.user should be (empty)
                userRequest2.token should be (empty)
            }
        }
    }
}

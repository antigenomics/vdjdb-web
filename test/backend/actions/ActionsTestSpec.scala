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

import backend.BaseTestSpecWithApplication
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider

import scala.concurrent.{Await, ExecutionContext}
import scala.concurrent.duration.Duration
import scala.language.reflectiveCalls

abstract class ActionsTestSpec extends BaseTestSpecWithApplication {
    lazy implicit val ec: ExecutionContext = app.injector.instanceOf[ExecutionContext]
    lazy implicit val stp: SessionTokenProvider = app.injector.instanceOf[SessionTokenProvider]
    lazy implicit val up: UserProvider = app.injector.instanceOf[UserProvider]
    lazy implicit val userRequestAction: UserRequestAction = app.injector.instanceOf[UserRequestAction]

    trait VerifiedUser {
        private final val _verifiedUserCredentials = new {
            lazy val login: String = "actions-test-verified"
            lazy val email: String = "actions-test-verified@mail.com"
            lazy val password: String = "actions-test-verified"
        }

        private final val _verificationToken = Await.result(up.createUser(
            _verifiedUserCredentials.login, _verifiedUserCredentials.email, _verifiedUserCredentials.password), Duration.Inf
        )
        private final val _verifiedUser = Await.result(up.verifyUser(_verificationToken), Duration.Inf)

        _verifiedUser should not be empty
        _verifiedUser.get.login shouldEqual _verifiedUserCredentials.login
        _verifiedUser.get.email shouldEqual _verifiedUserCredentials.email
        _verifiedUser.get.verified shouldEqual true

        final val user = _verifiedUser.get
        final val credentials = _verifiedUserCredentials
    }

    trait AuthorizedUser {
        private final val _authorizedUserCredentials = new {
            lazy val login: String = "actions-test-authorized"
            lazy val email: String = "actions-test-authorized@mail.com"
            lazy val password: String = "actions-test-authorized"
        }

        private final val _verificationToken = Await.result(up.createUser(
            _authorizedUserCredentials.login, _authorizedUserCredentials.email, _authorizedUserCredentials.password), Duration.Inf
        )
        private final val _authorizedUser = Await.result(up.verifyUser(_verificationToken), Duration.Inf)

        _authorizedUser should not be empty
        _authorizedUser.get.login shouldEqual _authorizedUserCredentials.login
        _authorizedUser.get.email shouldEqual _authorizedUserCredentials.email
        _authorizedUser.get.verified shouldEqual true

        private final val _sessionToken = Await.result(stp.createSessionToken(_authorizedUser.get), Duration.Inf)

        final val user = _authorizedUser.get
        final val sessionToken = _sessionToken
        final val credentials = _authorizedUserCredentials
    }

    //noinspection TypeAnnotation
    val fixtures = new {
        lazy val verifiedUser: VerifiedUser = new VerifiedUser {}
        lazy val authorizedUser: AuthorizedUser = new AuthorizedUser {}
    }
}

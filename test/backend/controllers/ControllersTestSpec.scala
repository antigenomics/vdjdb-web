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

package backend.controllers

import akka.stream.Materializer
import backend.BaseTestSpecWithApplication
import backend.models.authorization.tokens.reset.ResetTokenProvider
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.tokens.verification.VerificationTokenProvider
import backend.models.authorization.user.UserProvider
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc.Results

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.language.reflectiveCalls

abstract class ControllersTestSpec extends BaseTestSpecWithApplication with Results {
    lazy implicit val messagesApi: MessagesApi = app.injector.instanceOf[MessagesApi]
    lazy implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))
    lazy implicit val mat: Materializer = app.injector.instanceOf[Materializer]
    lazy implicit val up: UserProvider = app.injector.instanceOf[UserProvider]
    lazy implicit val vtp: VerificationTokenProvider = app.injector.instanceOf[VerificationTokenProvider]
    lazy implicit val stp: SessionTokenProvider = app.injector.instanceOf[SessionTokenProvider]
    lazy implicit val rtp: ResetTokenProvider = app.injector.instanceOf[ResetTokenProvider]

    trait NonExistentUser {
        private final val _nonExistentUserCredentials = new {
            lazy val login: String = "controllers-test-nonexistent"
            lazy val email: String = "controllers-test-nonexistent@mail.com"
            lazy val password: String = "controllers-test-nonexistent"
        }

        private final val _isExist = Await.result(up.get(_nonExistentUserCredentials.email), Duration.Inf)

        _isExist should be (empty)

        final val credentials = _nonExistentUserCredentials
    }

    trait UnverifiedUser {
        private final val _unverifiedUserCredentials = new {
            lazy val login: String = "controllers-test-unverified"
            lazy val email: String = "controllers-test-unverified@mail.com"
            lazy val password: String = "controllers-test-unverified"
        }

        private final val _verificationToken = Await.result(
            up.createUser(_unverifiedUserCredentials.login, _unverifiedUserCredentials.email, _unverifiedUserCredentials.password), Duration.Inf
        )
        private final val _unverifiedUser = Await.result(
            up.get(_verificationToken.userID), Duration.Inf
        )

        _unverifiedUser should not be empty
        _unverifiedUser.get.login shouldEqual _unverifiedUserCredentials.login
        _unverifiedUser.get.email shouldEqual _unverifiedUserCredentials.email
        _unverifiedUser.get.verified shouldEqual false

        final val user = _unverifiedUser.get
        final val credentials = _unverifiedUserCredentials
    }

    trait VerifiedUser {
        private final val _verifiedUserCredentials = new {
            lazy val login: String = "controllers-test-verified"
            lazy val email: String = "controllers-test-verified@mail.com"
            lazy val password: String = "controllers-test-verified"
        }

        private final val _verificationToken = Await.result(
            up.createUser(_verifiedUserCredentials.login, _verifiedUserCredentials.email, _verifiedUserCredentials.password), Duration.Inf
        )
        private final val _verifiedUser = Await.result(
            up.verifyUser(_verificationToken), Duration.Inf
        )

        _verifiedUser should not be empty
        _verifiedUser.get.login shouldEqual _verifiedUserCredentials.login
        _verifiedUser.get.email shouldEqual _verifiedUserCredentials.email
        _verifiedUser.get.verified shouldEqual true

        final val user = _verifiedUser.get
        final val credentials = _verifiedUserCredentials
    }

    trait LoggedUser {
        private final val _loggedUserCredentials = new {
            lazy val login: String = "controllers-test-logged"
            lazy val email: String = "controllers-test-logged@mail.com"
            lazy val password: String = "controllers-test-logged"
        }

        private final val _verificationToken = Await.result(
            up.createUser(_loggedUserCredentials.login, _loggedUserCredentials.email, _loggedUserCredentials.password), Duration.Inf
        )
        private final val _loggedUser = Await.result(
            up.verifyUser(_verificationToken), Duration.Inf
        )

        _loggedUser should not be empty
        _loggedUser.get.login shouldEqual _loggedUserCredentials.login
        _loggedUser.get.email shouldEqual _loggedUserCredentials.email
        _loggedUser.get.verified shouldEqual true

        final val user = _loggedUser.get
        final val loggedUserSessionToken = Await.result(stp.createSessionToken(user), Duration.Inf)
        final val credentials = _loggedUserCredentials

        loggedUserSessionToken should have length 255
    }

    final val fixtures = new {
        lazy val nonExistentUser: NonExistentUser = new NonExistentUser {}
        lazy val unverifiedUser: UnverifiedUser = new UnverifiedUser {}
        lazy val verifiedUser: VerifiedUser = new VerifiedUser {}
        lazy val loggedUser: LoggedUser = new LoggedUser {}
    }
}

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
import backend.models.authorization.permissions.UserPermissionsProvider
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
        private final val _credentials = new {
            lazy val login: String = "controllers-test-nonexistent"
            lazy val email: String = "controllers-test-nonexistent@mail.com"
            lazy val password: String = "controllers-test-nonexistent"
        }

        private final val _isExist = Await.result(up.get(_credentials.email), Duration.Inf)

        _isExist should be(empty)

        final val credentials = _credentials
    }

    trait UnverifiedUser {
        private final val _credentials = new {
            lazy val login: String = "controllers-test-unverified"
            lazy val email: String = "controllers-test-unverified@mail.com"
            lazy val password: String = "controllers-test-unverified"
        }

        private final val _isAlreadyExist = Await.result(up.get(_credentials.email), Duration.Inf)
        private final val _unverifiedUser = if (_isAlreadyExist.nonEmpty) _isAlreadyExist.get else {
            val token = Await.result(up.createUser(_credentials.login, _credentials.email, _credentials.password), Duration.Inf)
            val user = Await.result(up.get(_credentials.email), Duration.Inf)
            user should not be empty
            user.get
        }

        _unverifiedUser.login shouldEqual _credentials.login
        _unverifiedUser.email shouldEqual _credentials.email
        _unverifiedUser.verified shouldEqual false

        final val user = _unverifiedUser
        final val credentials = _credentials
    }

    trait VerifiedUser {
        private final val _credentials = new {
            lazy val login: String = "controllers-test-verified"
            lazy val email: String = "controllers-test-verified@mail.com"
            lazy val password: String = "controllers-test-verified"
        }

        private final val _isAlreadyExist = Await.result(up.get(_credentials.email), Duration.Inf)
        private final val _verifiedUser = if (_isAlreadyExist.nonEmpty) _isAlreadyExist.get else {
            val token = Await.result(up.createUser(_credentials.login, _credentials.email, _credentials.password), Duration.Inf)
            val user = Await.result(up.verifyUser(token), Duration.Inf)
            user should not be empty
            user.get
        }

        _verifiedUser.login shouldEqual _credentials.login
        _verifiedUser.email shouldEqual _credentials.email
        _verifiedUser.verified shouldEqual true

        final val user = _verifiedUser
        final val credentials = _credentials
    }

    trait LoggedUser {
        private final val _credentials = new {
            lazy val login: String = "controllers-test-logged"
            lazy val email: String = "controllers-test-logged@mail.com"
            lazy val password: String = "controllers-test-logged"
        }

        private final val _isAlreadyExist = Await.result(up.get(_credentials.email), Duration.Inf)
        private final val _loggedUser = if (_isAlreadyExist.nonEmpty) _isAlreadyExist.get else {
            val token = Await.result(up.createUser(_credentials.login, _credentials.email, _credentials.password), Duration.Inf)
            val user = Await.result(up.verifyUser(token), Duration.Inf)
            user should not be empty
            user.get
        }

        _loggedUser.login shouldEqual _credentials.login
        _loggedUser.email shouldEqual _credentials.email
        _loggedUser.verified shouldEqual true

        final val user = _loggedUser
        final val loggedUserSessionToken = Await.result(stp.createSessionToken(user), Duration.Inf)
        final val credentials = _credentials

        loggedUserSessionToken should have length 255
    }

    trait DemoUser {
        private final val _credentials = new {
            lazy val login: String = "controllers-test-demo"
            lazy val email: String = "controllers-test-demo@mail.com"
            lazy val password: String = "controllers-test-demo"
        }

        private final val _isAlreadyExist = Await.result(up.get(_credentials.email), Duration.Inf)
        private final val _demoUser = if (_isAlreadyExist.nonEmpty) _isAlreadyExist.get else {
            val token = Await.result(up.createUser(_credentials.login, _credentials.email, _credentials.password, UserPermissionsProvider.DEMO_ID), Duration.Inf)
            val user = Await.result(up.verifyUser(token), Duration.Inf)
            user should not be empty
            user.get
        }

        _demoUser.login shouldEqual _credentials.login
        _demoUser.email shouldEqual _credentials.email
        _demoUser.verified shouldEqual true

        final val user = _demoUser
        final val demoUserSessionToken = Await.result(stp.createSessionToken(user), Duration.Inf)
        final val credentials = _credentials

        demoUserSessionToken should have length 255
    }


    final val fixtures = new {
        lazy val nonExistentUser: NonExistentUser = new NonExistentUser {}
        lazy val unverifiedUser: UnverifiedUser = new UnverifiedUser {}
        lazy val verifiedUser: VerifiedUser = new VerifiedUser {}
        lazy val loggedUser: LoggedUser = new LoggedUser {}
        lazy val demoUser: DemoUser = new DemoUser {}
    }
}

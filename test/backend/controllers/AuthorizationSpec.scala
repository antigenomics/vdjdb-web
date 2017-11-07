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

import backend.models.authorization.forms.SignupForm
import backend.models.authorization.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.authorization.verification.VerificationTokenProvider
import play.api.test._
import play.api.test.Helpers._
import play.api.test.CSRFTokenHelper._

import scala.async.Async.{async, await}

class AuthorizationSpec extends ControllersTestSpec {
    implicit lazy val controller: Authorization = app.injector.instanceOf[Authorization]
    implicit lazy val userProvider: UserProvider = app.injector.instanceOf[UserProvider]
    implicit lazy val verificationTokenProvider: VerificationTokenProvider = app.injector.instanceOf[VerificationTokenProvider]
    implicit lazy val sessionTokenProvider: SessionTokenProvider = app.injector.instanceOf[SessionTokenProvider]

    "Authorization#login" should {
        "render login page" taggedAs ControllersTestTag in {
            val result = controller.login.apply(FakeRequest().withCSRFToken)
            val body = contentAsString(result)

            status(result) shouldEqual OK
            body should include ("csrf")
            body should include (messages("authorization.forms.login.login"))
        }

        "redirect user if logged in" taggedAs ControllersTestTag in {
            //TODO use fixtures
            async {
                val verificationToken = await(userProvider.createUser("hello", "login@mail.com", "password"))
                val user = await(userProvider.verifyUser(verificationToken.token))
                user should not be empty

                val sessionToken = await(sessionTokenProvider.createSessionToken(user.get))

                val request = FakeRequest().withSession(controller.getAuthTokenSessionName -> sessionToken).withCSRFToken
                val result = controller.login.apply(request)

                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
            }
        }
    }

    "Authorization#onLogin" should {
        "forbid to login with empty password or email fields" taggedAs ControllersTestTag in {
            val missingEmailRequest = FakeRequest()
                .withFormUrlEncodedBody("password" -> "password")
                .withCSRFToken
            val missingEmailResult = controller.onLogin(missingEmailRequest)

            val missingPasswordRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com")
                .withCSRFToken
            val missingPasswordResult = controller.onLogin(missingPasswordRequest)

            status(missingEmailResult) shouldEqual BAD_REQUEST
            status(missingPasswordResult) shouldEqual BAD_REQUEST

            val missingEmailResultBody = contentAsString(missingEmailResult)
            missingEmailResultBody should include (messages("error.required"))

            val missingPasswordResultBody = contentAsString(missingPasswordResult)
            missingPasswordResultBody should include (messages("error.required"))
        }

        "forbid to login with invalid email" taggedAs ControllersTestTag in {
            val invalidEmailRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "invalid", "password" -> "password")
                .withCSRFToken
            val invalidEmailResult = controller.onLogin(invalidEmailRequest)

            status(invalidEmailResult) shouldEqual BAD_REQUEST
            contentAsString(invalidEmailResult) should include (messages("error.email"))
        }

        "forbid to login with invalid credentials" taggedAs ControllersTestTag in {
            //val result = controller
            val invalidCredentialsRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "test@mail.com", "password" -> "password")
                .withCSRFToken
            val result = controller.onLogin(invalidCredentialsRequest)
            val body = contentAsString(result)
            status(result) shouldEqual BAD_REQUEST
            body should include (messages("authorization.forms.login.failed.message"))
            body should include (messages("authorization.forms.login.failed.workaround.1"))
            body should include (messages("authorization.forms.login.failed.workaround.2"))
        }

        "forbid to login for an unverified users" taggedAs ControllersTestTag in {
            async {
                val _ = await(userProvider.createUser("login", "test@mail.com", "password"))
                val newUserRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> "test@mail.com", "password" -> "password")
                    .withCSRFToken
                val result = controller.onLogin(newUserRequest)

                status(result) shouldEqual BAD_REQUEST
                contentAsString(result) should include (messages("authorization.forms.login.failed.unverified"))
            }
        }

        "able to create session for verified user" taggedAs ControllersTestTag in {
            async {
                val verificationToken = await(userProvider.createUser("login", "test1@mail.com", "password"))
                val verifiedUser = await(userProvider.verifyUser(verificationToken.token))
                verifiedUser should not be empty

                val verificationTokenAgain = await(verificationTokenProvider.get(verificationToken.token))
                verificationTokenAgain shouldBe empty

                val verifiedUserRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> "test1@mail.com", "password" -> "password")

                val result = controller.onLogin(verifiedUserRequest)

                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) should not be empty
                redirectLocation(result).get shouldEqual backend.controllers.routes.Application.index().url
                session(result).data should contain key controller.getAuthTokenSessionName

                val jwtSessionToken = session(result).data(controller.getAuthTokenSessionName)
                val sessionToken = await(sessionTokenProvider.get(jwtSessionToken))

                sessionToken should not be empty

                sessionToken.get.token shouldEqual jwtSessionToken
                sessionToken.get.userID shouldEqual verifiedUser.get.id
            }
        }
    }

    "Authorization#signup" should {
        "render signup page" taggedAs ControllersTestTag in {
            val result = controller.signup(FakeRequest().withCSRFToken)
            val body = contentAsString(result)

            status(result) shouldEqual OK
            body should include ("csrf")
            body should include (messages("authorization.forms.signup.signup"))
        }

        "redirect user if logged in" taggedAs ControllersTestTag in {
            //TODO use fixtures
            async {
                val verificationToken = await(userProvider.createUser("hello", "signup@mail.com", "password"))
                val user = await(userProvider.verifyUser(verificationToken.token))
                user should not be empty

                val sessionToken = await(sessionTokenProvider.createSessionToken(user.get))

                val request = FakeRequest().withSession(controller.getAuthTokenSessionName -> sessionToken).withCSRFToken
                val result = controller.login.apply(request)

                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
            }
        }
    }

    "Authorization#onSignup" should {
        "forbid to signup with invalid fields" taggedAs ControllersTestTag in {
            //Invalid field: login
            val missingLoginRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com", "password" -> "password", "repeatPassword" -> "password")
                .withCSRFToken
            val missingLoginResult = controller.onSignup(missingLoginRequest)

            status(missingLoginResult) shouldEqual BAD_REQUEST
            contentAsString(missingLoginResult) should include (messages("error.required"))

            //Invalid field: password
            val missingPasswordRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com", "login" -> "login", "repeatPassword" -> "password")
                .withCSRFToken
            val missingPasswordResult = controller.onSignup(missingPasswordRequest)

            status(missingPasswordResult) shouldEqual BAD_REQUEST
            contentAsString(missingPasswordResult) should include (messages("error.required"))

            //Invalid field: repeatPassword
            val missingRepeatPasswordRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com", "login" -> "login", "password" -> "password")
                .withCSRFToken
            val missingRepeatPasswordResult = controller.onSignup(missingRepeatPasswordRequest)

            status(missingRepeatPasswordResult) shouldEqual BAD_REQUEST
            contentAsString(missingRepeatPasswordResult) should include (messages("error.required"))

            //Invalid field: email (missing)
            val missingEmailRequest = FakeRequest()
                .withFormUrlEncodedBody("login" -> "login", "password" -> "password", "repeatPassword" -> "password")
                .withCSRFToken
            val missingEmailResult = controller.onSignup(missingEmailRequest)

            status(missingEmailResult) shouldEqual BAD_REQUEST
            contentAsString(missingEmailResult) should include (messages("error.required"))

            //Invalid field: email (not valid)
            val invalidEmailRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "invalid", "password" -> "password", "repeatPassword" -> "password", "login" -> "login")
                .withCSRFToken
            val invalidEmailResult = controller.onSignup(invalidEmailRequest)

            status(invalidEmailResult) shouldEqual BAD_REQUEST
            contentAsString(invalidEmailResult) should include (messages("error.email"))

            //Invalid field: password and repeatPassword are not equal
            val nonEqualPasswordsRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com", "password" -> "password", "repeatPassword" -> "password1", "login" -> "login")
                .withCSRFToken
            val nonEqualPasswordsResult = controller.onSignup(nonEqualPasswordsRequest)
            status(nonEqualPasswordsResult) shouldEqual BAD_REQUEST
            contentAsString(nonEqualPasswordsResult) should include (messages("authorization.forms.signup.failed.workaround.3"))

            //Invalid field: too small password
            val tooSmallPasswordRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com", "password" -> "p", "repeatPassword" -> "p", "login" -> "login")
                .withCSRFToken
            val tooSmallPasswordResult = controller.onSignup(tooSmallPasswordRequest)
            status(tooSmallPasswordResult) shouldEqual BAD_REQUEST
            contentAsString(tooSmallPasswordResult) should include (messages("error.minLength", SignupForm.PASSWORD_MIN_LENGTH))
        }
    }

    "Authorization#verify" should {
        "verify user with valid token" taggedAs ControllersTestTag in {
            async {
                val verificationToken = await(userProvider.createUser("login", "verifyme@mail.com", "password"))
                val result = controller.verify(verificationToken.token).apply(FakeRequest())
                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) should not be empty
                redirectLocation(result).get shouldEqual backend.controllers.routes.Authorization.login().url
                flash(result).get("verified") shouldBe Some("authorization.forms.login.flashing.verified")

                val user = await(userProvider.get(verificationToken.userID))
                user should not be empty
                user.get.verified shouldEqual true

                val verificationTokenAgain = await(verificationTokenProvider.get(verificationToken.token))
                verificationTokenAgain shouldBe empty
            }
        }

        "redirect with an invalid token" taggedAs ControllersTestTag in {
            val result = controller.verify("dummy").apply(FakeRequest())
            status(result) shouldEqual BAD_REQUEST
            contentAsString(result) should include (messages("authorization.verification.invalidToken"))
        }
    }
}

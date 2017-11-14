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
import backend.models.authorization.tokens.reset.ResetTokenProvider
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.authorization.tokens.verification.VerificationTokenProvider
import play.api.mvc.DiscardingCookie
import play.api.test._
import play.api.test.Helpers._
import play.api.test.CSRFTokenHelper._

import scala.async.Async.{async, await}
import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.language.reflectiveCalls

class AuthorizationSpec extends ControllersTestSpec {
    implicit lazy val controller: Authorization = app.injector.instanceOf[Authorization]
    implicit lazy val up: UserProvider = app.injector.instanceOf[UserProvider]
    implicit lazy val vtp: VerificationTokenProvider = app.injector.instanceOf[VerificationTokenProvider]
    implicit lazy val stp: SessionTokenProvider = app.injector.instanceOf[SessionTokenProvider]
    implicit lazy val rtp: ResetTokenProvider = app.injector.instanceOf[ResetTokenProvider]

    trait UnverifiedUser {
        private final val _verificationToken = Await.result(up.createUser("unverifieduser", "unverifieduser@mail.com", "unverifieduser"), Duration.Inf)
        private final val _unverifiedUser = Await.result(up.get(_verificationToken.userID), Duration.Inf)

        _unverifiedUser should not be empty

        final val user = _unverifiedUser.get
    }

    trait VerifiedUser {
        private final val _verificationToken = Await.result(up.createUser("vefifieduser", "verifieduser@mail.com", "verifieduser"), Duration.Inf)
        private final val _verifiedUser = Await.result(up.verifyUser(_verificationToken), Duration.Inf)

        _verifiedUser should not be empty
        _verifiedUser.get.verified shouldEqual true

        final val user = _verifiedUser.get
        final val password = "verifieduser"
    }

    trait LoggedUser {
        private final val _verificationToken = Await.result(up.createUser("loggeduser", "loggeduser@mail.com", "loggeduser"), Duration.Inf)
        private final val _loggedUser = Await.result(up.verifyUser(_verificationToken), Duration.Inf)

        _loggedUser should not be empty
        _loggedUser.get.verified shouldEqual true

        final val user = _loggedUser.get
        final val loggedUserSessionToken = Await.result(stp.createSessionToken(user), Duration.Inf)
        final val password = "loggeduser"

        loggedUserSessionToken should have length 255
    }

    //noinspection TypeAnnotation
    final val fixtures =
        new {
            lazy val unverifiedUser: UnverifiedUser = new UnverifiedUser {}
            lazy val verifiedUser: VerifiedUser = new VerifiedUser {}
            lazy val loggedUser: LoggedUser = new LoggedUser {}
        }

    "Authorization#login" should {
        "render login page" taggedAs ControllersTestTag in {
            val result = controller.login.apply(FakeRequest().withCSRFToken)
            val body = contentAsString(result)

            status(result) shouldEqual OK
            body should include ("csrf")
            body should include (messages("authorization.forms.login.login"))
        }

        "redirect user if logged in" taggedAs ControllersTestTag in {
            val f = fixtures
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> f.loggedUser.loggedUserSessionToken).withCSRFToken
            val result = controller.login.apply(request)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
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
                val _ = await(up.createUser("login", "test@mail.com", "password"))
                val newUserRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> "test@mail.com", "password" -> "password")
                    .withCSRFToken
                val result = controller.onLogin(newUserRequest)

                status(result) shouldEqual BAD_REQUEST
                contentAsString(result) should include (messages("authorization.forms.login.failed.unverified"))
            }
        }

        "be able to create session for verified user" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val verifiedUser = f.verifiedUser
                val verifiedUserRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> verifiedUser.user.email, "password" -> verifiedUser.password)
                    .withCSRFToken

                val result = controller.onLogin(verifiedUserRequest)

                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) should not be empty
                redirectLocation(result).get shouldEqual backend.controllers.routes.Application.index().url
                session(result).data should contain key stp.getAuthTokenSessionName

                val jwtSessionToken = session(result).data(stp.getAuthTokenSessionName)
                val sessionToken = await(stp.get(jwtSessionToken))
                sessionToken should not be empty
                sessionToken.get.token shouldEqual jwtSessionToken
                sessionToken.get.userID shouldEqual verifiedUser.user.id

                val sessionRequest = FakeRequest()
                    .withSession(stp.getAuthTokenSessionName -> sessionToken.get.token)
                val nextResult = controller.login(sessionRequest)
                status(nextResult) shouldEqual SEE_OTHER

                val logoutResult = controller.logout(sessionRequest)
                status(logoutResult) shouldEqual SEE_OTHER
                session(logoutResult).data shouldNot contain key stp.getAuthTokenSessionName
                cookies(logoutResult) should contain (DiscardingCookie("logged").toCookie)
                cookies(logoutResult) should contain (DiscardingCookie("login").toCookie)
                cookies(logoutResult) should contain (DiscardingCookie("email").toCookie)
            }
        }

        "forbid to login with invalid password" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val verifiedUser = f.verifiedUser
                val verifiedUserRequestWithInvalidPassword = FakeRequest()
                    .withFormUrlEncodedBody("email" -> verifiedUser.user.email, "password" -> (verifiedUser.password + "invalidpart"))
                    .withCSRFToken

                val result = controller.onLogin(verifiedUserRequestWithInvalidPassword)
                status(result) shouldEqual BAD_REQUEST
                contentAsString(result) should include (messages("authorization.forms.login.failed.message"))
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
            val f = fixtures
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> f.loggedUser.loggedUserSessionToken).withCSRFToken
            val result = controller.login.apply(request)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
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

        "forbid to signup with the same email" in {
            async {
                val f = fixtures
                val verifiedUser = f.verifiedUser.user

                val sameEmailRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> verifiedUser.email, "login" -> "login", "password" -> "12345678", "repeatPassword" -> "12345678")
                    .withCSRFToken

                val sameEmailResult = controller.onSignup(sameEmailRequest)
                status(sameEmailResult) shouldEqual BAD_REQUEST
                contentAsString(sameEmailResult) should include (messages("authorization.forms.signup.failed.alreadyExists"))
            }
        }

        "be able to create new user" in {
            async {
                val validRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> "validemail@mail.com", "login" -> "login", "password" -> "password", "repeatPassword" -> "password")
                    .withCSRFToken

                val validResult = controller.onSignup(validRequest)

                status(validResult) shouldEqual SEE_OTHER
                flash(validResult).data should contain key "created"

                val user = await(up.get("validemail@mail.com"))

                user should not be empty
                user.get.email shouldEqual "validemail@mail.com"
                user.get.login shouldEqual "login"

                if (up.isVerificationRequired) {
                    user.get.verified shouldEqual false
                    flash(validResult).get("created").get should include ("authorization.forms.signup.success.created")
                } else {
                    user.get.verified shouldEqual true
                    flash(validResult).get("created").get should include ("authorization.forms.signup.success.createdAndVerified")
                }
            }
        }
    }

    "Authorization#resetRequest" should {
        "render resetRequest page" taggedAs ControllersTestTag in {
            val result = controller.resetRequest(FakeRequest().withCSRFToken)
            val body = contentAsString(result)

            status(result) shouldEqual OK
            body should include ("csrf")
            body should include (messages("authorization.forms.reset.reset"))
        }

        "redirect user if logged in" taggedAs ControllersTestTag in {
            val f = fixtures
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> f.loggedUser.loggedUserSessionToken).withCSRFToken
            val result = controller.login.apply(request)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
        }
    }

    "Authorization#onResetRequest" should {
        "redirect with message after request for invalid email" taggedAs ControllersTestTag in {
            val resetRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "dummy@mail.com")
                .withCSRFToken

            val result = controller.onResetRequest.apply(resetRequest)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(backend.controllers.routes.Authorization.login().url)
            flash(result).data should contain key "reset_request"
            flash(result).data("reset_request") shouldEqual "authorization.forms.reset.flashing.message"
        }

        "redirect with message and create reset token for verified email" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val user = f.verifiedUser.user

                val resetToken = await(rtp.getByUserID(user.id))
                resetToken should be(empty)

                val resetRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> user.email)
                    .withCSRFToken

                val result = controller.onResetRequest.apply(resetRequest)

                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) shouldEqual Some(backend.controllers.routes.Authorization.login().url)
                flash(result).data should contain key "reset_request"
                flash(result).data("reset_request") shouldEqual "authorization.forms.reset.flashing.message"

                val resetTokenAgain = await(rtp.getByUserID(user.id))
                resetTokenAgain should not be empty

                val tokenWithUser = await(rtp.getWithUser(resetTokenAgain.get.token))

                tokenWithUser should not be empty
                tokenWithUser.get._1.token shouldEqual resetTokenAgain.get.token
                tokenWithUser.get._2.email shouldEqual user.email
                tokenWithUser.get._2.login shouldEqual user.login
            }
        }

        "redirect with message and create reset token for unverified email" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val user = f.unverifiedUser.user

                val resetToken = await(rtp.getByUserID(user.id))
                resetToken should be(empty)

                val resetRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> user.email)
                    .withCSRFToken

                val result = controller.onResetRequest.apply(resetRequest)

                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) shouldEqual Some(backend.controllers.routes.Authorization.login().url)
                flash(result).data should contain key "reset_request"
                flash(result).data("reset_request") shouldEqual "authorization.forms.reset.flashing.message"

                val resetTokenAgain = await(rtp.getByUserID(user.id))
                resetTokenAgain should not be empty

                val tokenWithUser = await(rtp.getWithUser(resetTokenAgain.get.token))

                tokenWithUser should not be empty
                tokenWithUser.get._1.token shouldEqual resetTokenAgain.get.token
                tokenWithUser.get._2.email shouldEqual user.email
                tokenWithUser.get._2.login shouldEqual user.login
            }
        }
    }

    "Authorization#reset" should {
        "render page only for valid token" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val user = f.verifiedUser.user

                val tokenStr = await(rtp.createResetToken(user))
                val request = FakeRequest().withCSRFToken
                val result = controller.reset(tokenStr).apply(request)

                status(result) shouldEqual OK
                contentAsString(result) should include (messages("authorization.forms.reset.reset"))
            }
        }

        "redirect user if token is invalid" taggedAs ControllersTestTag in {
            val request = FakeRequest().withCSRFToken
            val result = controller.reset("dummy").apply(request)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
        }

        "redirect user if logged in" taggedAs ControllersTestTag in {
            val f = fixtures
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> f.loggedUser.loggedUserSessionToken).withCSRFToken
            val result = controller.reset("dummy").apply(request)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(backend.controllers.routes.Application.index().url)
        }
    }

    "Authorization#onReset" should {
        "forbid to reset with non-equal passwords" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val user = f.verifiedUser.user

                val tokenStr = await(rtp.createResetToken(user))
                val request = FakeRequest().withFormUrlEncodedBody("newPassword" -> "12345678", "newPasswordRepeat" -> "123456789").withCSRFToken
                val result = controller.onReset(tokenStr).apply(request)

                status(result) shouldEqual BAD_REQUEST
                contentAsString(result) should include (messages("authorization.forms.signup.failed.workaround.3"))
            }
        }

        "be able to reset password with valid token" taggedAs ControllersTestTag in {
            async {
                val verificationToken = await(up.createUser("onReset", "onReset@mail.com", "12345678"))
                val user = await(up.verifyUser(verificationToken))
                user should not be empty
                user.get.checkPassword("12345678") shouldEqual true

                val tokenStr = await(rtp.createResetToken(user.get))
                val request = FakeRequest().withFormUrlEncodedBody("newPassword" -> "87654321", "newPasswordRepeat" -> "87654321").withCSRFToken

                val result = controller.onReset(tokenStr).apply(request)

                status(result) shouldEqual SEE_OTHER
                flash(result).data should contain key "reset"
                flash(result).data("reset") shouldEqual "authorization.forms.login.flashing.reset"

                val tokenAfterUsage = await(rtp.get(tokenStr))
                tokenAfterUsage should be (empty)

                val userAfterReset = await(up.get(user.get.email))
                userAfterReset should not be empty
                userAfterReset.get.checkPassword("87654321") shouldEqual true
            }
        }
    }

    "Authorization#verifyWithToken" should {
        "verify user with valid token" taggedAs ControllersTestTag in {
            async {
                val verificationToken = await(up.createUser("login", "verifyme@mail.com", "password"))
                val result = controller.verifyWithToken(verificationToken.token).apply(FakeRequest())
                status(result) shouldEqual SEE_OTHER
                redirectLocation(result) should not be empty
                redirectLocation(result).get shouldEqual backend.controllers.routes.Authorization.login().url
                flash(result).get("verified") shouldBe Some("authorization.forms.login.flashing.verified")

                val user = await(up.get(verificationToken.userID))
                user should not be empty
                user.get.verified shouldEqual true

                val verificationTokenAgain = await(vtp.get(verificationToken.token))
                verificationTokenAgain shouldBe empty
            }
        }

        "redirect with an invalid token" taggedAs ControllersTestTag in {
            val result = controller.verifyWithToken("dummy").apply(FakeRequest())
            status(result) shouldEqual BAD_REQUEST
            contentAsString(result) should include (messages("authorization.verification.invalidToken"))
        }
    }

    "Authorization#logout" should {
        "be able to redirect unauthorized users" taggedAs ControllersTestTag in {
            val request = FakeRequest()
            val result = controller.logout(request)

            status(result) shouldEqual SEE_OTHER
        }

        "be able to logout authorized user" taggedAs ControllersTestTag in {
            val f = fixtures
            val verifiedUser = f.verifiedUser
            val verifiedUserRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> verifiedUser.user.email, "password" -> verifiedUser.password)

            val result = controller.onLogin(verifiedUserRequest)

            session(result).data should contain key stp.getAuthTokenSessionName

            val sessionToken = session(result).data.get(stp.getAuthTokenSessionName)

            sessionToken should not be empty

            val logoutRequest = FakeRequest().withSession((stp.getAuthTokenSessionName, sessionToken.get))
            val logoutResult = controller.logout(logoutRequest)

            status(logoutResult) shouldEqual SEE_OTHER
            redirectLocation(logoutResult) shouldEqual Some(backend.controllers.routes.Application.index().url)
            session(logoutResult).data shouldNot contain key stp.getAuthTokenSessionName
        }
    }
}

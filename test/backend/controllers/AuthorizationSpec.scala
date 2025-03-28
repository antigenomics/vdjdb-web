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
import play.api.mvc.DiscardingCookie
import play.api.test._
import play.api.test.Helpers._
import play.api.test.CSRFTokenHelper._

import scala.async.Async.{async, await}
import scala.language.reflectiveCalls

class AuthorizationSpec extends ControllersTestSpec {
    implicit lazy val controller: Authorization = app.injector.instanceOf[Authorization]

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
            val f = fixtures
            val nonexistentUser = f.nonExistentUser
            val invalidCredentialsRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> nonexistentUser.credentials.email, "password" -> nonexistentUser.credentials.password)
                .withCSRFToken
            val result = controller.onLogin(invalidCredentialsRequest)
            val body = contentAsString(result)
            status(result) shouldEqual BAD_REQUEST
            body should include (messages("authorization.forms.login.failed.message"))
            body should include (messages("authorization.forms.login.failed.workaround.1"))
            body should include (messages("authorization.forms.login.failed.workaround.2"))
        }

        "forbid to login for an unverified users" taggedAs ControllersTestTag in {
            val f = fixtures
            val unverifiedUser = f.unverifiedUser
            val newUserRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> unverifiedUser.credentials.email, "password" -> unverifiedUser.credentials.password)
                .withCSRFToken
            val result = controller.onLogin(newUserRequest)

            status(result) shouldEqual BAD_REQUEST
            contentAsString(result) should include (messages("authorization.forms.login.failed.unverified"))
        }

        "be able to create session for verified user" taggedAs ControllersTestTag in {
            async {
                val f = fixtures
                val verifiedUser = f.verifiedUser
                val verifiedUserRequest = FakeRequest()
                    .withFormUrlEncodedBody("email" -> verifiedUser.user.email, "password" -> verifiedUser.credentials.password)
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
                    .withFormUrlEncodedBody("email" -> verifiedUser.user.email, "password" -> (verifiedUser.credentials.password + "invalidpart"))
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

            val dummyChar: String = "d"
            //Invalid field: too small password
            val tooSmallPasswordRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com",
                    "password" -> dummyChar * (SignupForm.PASSWORD_MIN_LENGTH - 1),
                    "repeatPassword" -> dummyChar * (SignupForm.PASSWORD_MIN_LENGTH - 1), "login" -> "login")
                .withCSRFToken
            val tooSmallPasswordResult = controller.onSignup(tooSmallPasswordRequest)
            status(tooSmallPasswordResult) shouldEqual BAD_REQUEST
            contentAsString(tooSmallPasswordResult) should include (messages("error.minLength", SignupForm.PASSWORD_MIN_LENGTH))

            //Invalid field: too big password
            val tooBigPasswordRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com",
                    "password" -> dummyChar * (SignupForm.PASSWORD_MAX_LENGTH + 1),
                    "repeatPassword" -> dummyChar * (SignupForm.PASSWORD_MAX_LENGTH + 1), "login" -> "login")
                .withCSRFToken
            val tooBigPasswordResult = controller.onSignup(tooBigPasswordRequest)
            status(tooBigPasswordResult) shouldEqual BAD_REQUEST
            contentAsString(tooBigPasswordResult) should include (messages("error.maxLength", SignupForm.PASSWORD_MAX_LENGTH))

            //Invalid field: too big email
            val tooBigEmailRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> ((dummyChar * SignupForm.EMAIL_MAX_LENGTH + 1) + "@mail.com"),
                    "password" -> "password", "repeatPassword" -> "password", "login" -> "login").withCSRFToken
            val tooBigEmailResult = controller.onSignup(tooBigEmailRequest)
            status(tooBigEmailResult) shouldEqual BAD_REQUEST
            contentAsString(tooBigEmailResult) should include (messages("authorization.forms.signup.failed.workaround.4"))

            //Invalid field: too big login
            val tooBigLoginRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com",
                    "password" -> "password", "repeatPassword" -> "password", "login" -> dummyChar * (SignupForm.LOGIN_MAX_LENGTH + 1)).withCSRFToken
            val tooBigLoginResult = controller.onSignup(tooBigLoginRequest)
            status(tooBigLoginResult) shouldEqual BAD_REQUEST
            contentAsString(tooBigLoginResult) should include (messages("error.maxLength", SignupForm.LOGIN_MAX_LENGTH))

            //Invalid field: empty login
            val emptyLoginRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> "email@mail.com",
                    "password" -> "password", "repeatPassword" -> "password", "login" -> "").withCSRFToken
            val emptyLoginResult = controller.onSignup(emptyLoginRequest)
            status(emptyLoginResult) shouldEqual BAD_REQUEST
            contentAsString(emptyLoginResult) should include (messages("error.required"))
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
                val newUserCredentials = new {
                    lazy val login: String = "Authorization#onSignup#login"
                    lazy val email: String = "Authorization#onSignup#email@mail.com"
                    lazy val password: String = "Authorization#onSignup#password"
                }

                val validRequest = FakeRequest()
                    .withFormUrlEncodedBody(
                        "email" -> newUserCredentials.email,
                        "login" -> newUserCredentials.login,
                        "password" -> newUserCredentials.password,
                        "repeatPassword" -> newUserCredentials.password)
                    .withCSRFToken

                val validResult = controller.onSignup(validRequest)

                status(validResult) shouldEqual SEE_OTHER
                flash(validResult).data should contain key "created"

                val user = await(up.get(newUserCredentials.email))

                user should not be empty
                user.get.email shouldEqual newUserCredentials.email
                user.get.login shouldEqual newUserCredentials.login

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
            val f = fixtures
            val nonExistentUser = f.nonExistentUser
            val resetRequest = FakeRequest()
                .withFormUrlEncodedBody("email" -> nonExistentUser.credentials.email)
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
                val resetUserCredentials = new {
                    lazy val login: String = "Authorization#onReset#login"
                    lazy val email: String = "Authorization#onReset#email@mail.com"
                    lazy val password: String = "Authorization#onReset#password"
                    lazy val resetPassword: String = "Authorization#onReset#reset-password"
                }
                val verificationToken = await(up.createUser(
                    resetUserCredentials.login, resetUserCredentials.email, resetUserCredentials.password)
                )

                val user = await(up.verifyUser(verificationToken))
                user should not be empty
                user.get.checkPassword(resetUserCredentials.password) shouldEqual true

                val tokenStr = await(rtp.createResetToken(user.get))
                val request = FakeRequest().withFormUrlEncodedBody(
                    "newPassword" -> resetUserCredentials.resetPassword, "newPasswordRepeat" -> resetUserCredentials.resetPassword)
                    .withCSRFToken

                val result = controller.onReset(tokenStr).apply(request)

                status(result) shouldEqual SEE_OTHER
                flash(result).data should contain key "reset"
                flash(result).data("reset") shouldEqual "authorization.forms.login.flashing.reset"

                val tokenAfterUsage = await(rtp.get(tokenStr))
                tokenAfterUsage should be (empty)

                val userAfterReset = await(up.get(user.get.email))
                userAfterReset should not be empty
                userAfterReset.get.checkPassword(resetUserCredentials.resetPassword) shouldEqual true
            }
        }
    }

    "Authorization#verifyWithToken" should {
        "verify user with valid token" taggedAs ControllersTestTag in {
            async {
                val verifyMeUserCredentials = new {
                    lazy val login: String = "Authorization#verifyWithToken#login"
                    lazy val email: String = "Authorization#verifyWithToken@mail.com"
                    lazy val password: String = "Authorization#verifyWithToken#password"
                }
                val verificationToken = await(up.createUser(
                    verifyMeUserCredentials.login, verifyMeUserCredentials.email, verifyMeUserCredentials.password)
                )
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
                .withFormUrlEncodedBody("email" -> verifiedUser.user.email, "password" -> verifiedUser.credentials.password)

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

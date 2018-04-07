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

package backend.controllers

import backend.actions.{SessionAction, UserRequestAction}
import play.api.test.FakeRequest
import play.api.test.Helpers._
import play.api.test.CSRFTokenHelper._

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.language.reflectiveCalls

class AccountSpec extends ControllersTestSpec {
    implicit lazy val userRequestAction: UserRequestAction = app.injector.instanceOf[UserRequestAction]
    implicit lazy val controller: Account = app.injector.instanceOf[Account]

    "Account#detailsPage" should {
        "redirect unauthorized users"  taggedAs ControllersTestTag in {
            val request = FakeRequest()
            val result = controller.detailsPage.apply(request.withCSRFToken)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(SessionAction.redirectLoadtion.url)
        }

        "render details page for logged user" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> fixtures.loggedUser.loggedUserSessionToken)
            val result = controller.detailsPage.apply(request.withCSRFToken)
            val body = contentAsString(result)

            status(result) shouldEqual OK
            body should include("csrf")
            body should include(messages("account.details.header"))
            body should include(messages("account.change.password.header"))
            body should include(messages("account.change.password.button"))
        }

        "render details page for demo user" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> fixtures.demoUser.demoUserSessionToken)
            val result = controller.detailsPage.apply(request.withCSRFToken)
            val body = contentAsString(result)

            status(result) shouldEqual OK
            body should not include ("csrf")
            body should include(messages("account.details.header"))
            body should not include (messages("account.change.password.header"))
            body should not include (messages("account.change.password.button"))
        }
    }

    "Account#changePassword" should {
        val changePasswordUserCredentials = new {
            lazy val login: String = "Account#changePassword#login"
            lazy val email: String = "Account#changePassword#email@mail.com"
            lazy val password: String = "Account#changePassword#password"
            lazy val changePassword: String = "Account#changePassword#change-password"
        }
        val verificationToken = Await.result(up.createUser(
            changePasswordUserCredentials.login, changePasswordUserCredentials.email, changePasswordUserCredentials.password), Duration.Inf
        )

        val user = Await.result(up.verifyUser(verificationToken), Duration.Inf)
        user should not be empty
        user.get.checkPassword(changePasswordUserCredentials.password) shouldEqual true

        val userSessionToken = Await.result(stp.createSessionToken(user.get), Duration.Inf)

        "redirect unauthorized users"  taggedAs ControllersTestTag in {
            val request = FakeRequest().withFormUrlEncodedBody(
                "oldPassword" -> changePasswordUserCredentials.password,
                "newPassword" -> (changePasswordUserCredentials.changePassword + "dummy"),
                "newPasswordRepeat" -> changePasswordUserCredentials.changePassword)
                .withCSRFToken
            val result = controller.changePassword.apply(request)

            status(result) shouldEqual SEE_OTHER
            redirectLocation(result) shouldEqual Some(SessionAction.redirectLoadtion.url)
        }

        "forbid to reset with non-equal passwords" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> userSessionToken).withFormUrlEncodedBody(
                "oldPassword" -> changePasswordUserCredentials.password,
                "newPassword" -> (changePasswordUserCredentials.changePassword + "dummy"),
                "newPasswordRepeat" -> changePasswordUserCredentials.changePassword)
                .withCSRFToken
            val result = controller.changePassword.apply(request)
            val body = contentAsString(result)

            status(result) shouldEqual BAD_REQUEST
            body should include ("csrf")
            body should include (messages("authorization.forms.signup.failed.workaround.3"))
        }

        "forbid to reset with wrong old password" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> userSessionToken).withFormUrlEncodedBody(
                "oldPassword" -> (changePasswordUserCredentials.password + "dummy"),
                "newPassword" -> (changePasswordUserCredentials.changePassword),
                "newPasswordRepeat" -> changePasswordUserCredentials.changePassword)
                .withCSRFToken
            val result = controller.changePassword.apply(request)
            val body = contentAsString(result)

            status(result) shouldEqual BAD_REQUEST
            body should include ("csrf")
            body should include (messages("account.change.password.error.invalidOldPassword"))
        }

        "be able to reset password for user with valid credentials" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> userSessionToken).withFormUrlEncodedBody(
                "oldPassword" -> changePasswordUserCredentials.password,
                "newPassword" -> changePasswordUserCredentials.changePassword,
                "newPasswordRepeat" -> changePasswordUserCredentials.changePassword)
                .withCSRFToken
            val result = controller.changePassword.apply(request)

            status(result) shouldEqual SEE_OTHER
            flash(result).data should contain key "changed"
            flash(result).data("changed") shouldEqual "account.change.password.success"

            val userAfterChange = Await.result(up.get(changePasswordUserCredentials.email), Duration.Inf)
            userAfterChange should not be empty
            userAfterChange.get.checkPassword(changePasswordUserCredentials.changePassword) shouldEqual true
        }
    }
}

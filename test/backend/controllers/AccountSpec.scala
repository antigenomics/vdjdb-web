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
            redirectLocation(result) shouldEqual Some(SessionAction.loginLocation.url)
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

        /* The demo permission row is 0 samples, 0 MiB, uploading off. Printed as ordinary ceilings
         * that read as broken: "2 of 0", a cap the account already holds more than, and "0 MiB
         * each", a size that permits no file at all. An account that cannot upload gets no upload
         * ceilings.
         */
        "not quote upload ceilings to an account that cannot upload" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> fixtures.demoUser.demoUserSessionToken)
            val body = contentAsString(controller.detailsPage.apply(request.withCSRFToken))

            body should include("Uploaded samples")
            body should not include ("of 0")
            body should not include ("0 MiB")
            body should not include ("Uploaded file size")
            body should not include ("Clonotypes per sample")
        }

        /* The details column shares a sixteen-wide grid with the change-password panel, and that
         * panel is only rendered for accounts allowed to change their password. Demo and token
         * accounts are not, so a fixed `ten wide` left them 6/16 of the card empty.
         */
        "span the grid when there is no change-password panel beside it" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> fixtures.demoUser.demoUserSessionToken)
            val body = contentAsString(controller.detailsPage.apply(request.withCSRFToken))

            // Matched on the grid <div>: the table cells are "ten wide column" <td>s, so the bare
            // string is present either way and asserting on it tests nothing.
            body should include("<div class=\"sixteen wide column\">")
            body should not include ("<div class=\"ten wide column\">")
        }

        "leave room for the panel when there is one" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> fixtures.loggedUser.loggedUserSessionToken)
            val body = contentAsString(controller.detailsPage.apply(request.withCSRFToken))

            body should include("<div class=\"ten wide column\">")
            body should include("<div class=\"six wide column\">")
            body should not include ("<div class=\"sixteen wide column\">")
        }

        // Everything above still has to reach an account that can upload, or the row would be gone
        // for everyone rather than for the accounts the ceiling means nothing to.
        "still quote them to an account that can" taggedAs ControllersTestTag in {
            val request = FakeRequest().withSession(stp.getAuthTokenSessionName -> fixtures.loggedUser.loggedUserSessionToken)
            val body = contentAsString(controller.detailsPage.apply(request.withCSRFToken))

            body should include("Uploaded file size")
            body should include("Clonotypes per sample")
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
            redirectLocation(result) shouldEqual Some(SessionAction.loginLocation.url)
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

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

package backend.models.authorization.forms

import play.api.data._
import play.api.data.Forms._

case class SignupForm(login: String, email: String, password: String, repeatPassword: String)

object SignupForm {
    final val EMAIL_MAX_LENGTH = 128
    final val LOGIN_MAX_LENGTH = 64
    final val PASSWORD_MIN_LENGTH = 6
    final val PASSWORD_MAX_LENGTH = 50

    implicit val signupFormMapping: Form[SignupForm] = Form(mapping(
        "login" -> nonEmptyText(maxLength = LOGIN_MAX_LENGTH),
        "email" -> email,
        "password" -> nonEmptyText(minLength = PASSWORD_MIN_LENGTH, maxLength = PASSWORD_MAX_LENGTH),
        "repeatPassword" -> nonEmptyText(minLength = PASSWORD_MIN_LENGTH, maxLength = PASSWORD_MAX_LENGTH)
    )(SignupForm.apply)(SignupForm.unapply) verifying("authorization.forms.signup.failed.workaround.3", { signupForm =>
        signupForm.password == signupForm.repeatPassword
    }) verifying("authorization.forms.signup.failed.workaround.4", { signupForm =>
        signupForm.email.length < SignupForm.EMAIL_MAX_LENGTH
    }))

    final val signupFailedFormMapping: Form[SignupForm] =
        signupFormMapping.withGlobalError("authorization.forms.signup.failed.message")
            .withGlobalError("authorization.forms.signup.failed.workaround.1")
            .withGlobalError("authorization.forms.signup.failed.workaround.2")
            .withGlobalError("authorization.forms.signup.failed.workaround.3")

    final val userAlreadyExistsFormMapping: Form[SignupForm] =
        signupFormMapping.withGlobalError("authorization.forms.signup.failed.alreadyExists")
}



/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

package backend.models.authorization.forms

import backend.models.authorization.forms.SignupForm.{PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH}
import play.api.data.Form
import play.api.data.Forms.{mapping, nonEmptyText}

case class ChangeForm(oldPassword: String, newPassword: String, newPasswordRepeat: String)

object ChangeForm {
  implicit val changeFormMapping: Form[ChangeForm] = Form(mapping(
    "oldPassword" -> nonEmptyText,
    "newPassword" -> nonEmptyText(minLength = PASSWORD_MIN_LENGTH, maxLength = PASSWORD_MAX_LENGTH),
    "newPasswordRepeat" -> nonEmptyText(minLength = PASSWORD_MIN_LENGTH, maxLength = PASSWORD_MAX_LENGTH)
  )(ChangeForm.apply)(ChangeForm.unapply) verifying("authorization.forms.signup.failed.workaround.3", { changeForm =>
    changeForm.newPassword == changeForm.newPasswordRepeat
  }))

  implicit val invalidOldPasswordChangeFormMapping: Form[ChangeForm] = changeFormMapping
    .withGlobalError("account.change.password.error.invalidOldPassword")
}
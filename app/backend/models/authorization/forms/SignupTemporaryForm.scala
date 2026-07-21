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

import play.api.data.Forms._
import play.api.data._

case class SignupTemporaryForm(token: String)

object SignupTemporaryForm {
  final val TOKEN_MAX_LENGTH = 128

  /** Tokens are the *only* credential for a temporary account, so they must not be guessable.
    * 26 characters of `CommonUtils.secureRandomString` is ~128 bits; this is also the floor accepted
    * from a client, so a hand-crafted short token ("1" used to be valid) is rejected. */
  final val TOKEN_LENGTH     = 26
  final val TOKEN_MIN_LENGTH = 16

  implicit val signupTemporaryFormMapping: Form[SignupTemporaryForm] = Form(
    mapping(
      "token" -> nonEmptyText(minLength = TOKEN_MIN_LENGTH, maxLength = TOKEN_MAX_LENGTH)
    )(SignupTemporaryForm.apply)(SignupTemporaryForm.unapply) verifying ("authorization.forms.signup.failed.invalidToken", { form =>
      form.token.toLowerCase().forall(c => "abcdefghijklmnopqrstuvwxyz0123456789".contains(c))
    })
  )

  final val tokenInUseTemporaryFormMapping: Form[SignupTemporaryForm] =
    signupTemporaryFormMapping.withGlobalError("authorization.forms.signup.failed.tokenInUse")
}

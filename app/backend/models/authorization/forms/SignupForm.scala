package backend.models.authorization.forms

import play.api.data._
import play.api.data.Forms._

case class SignupForm(login: String, email: String, password: String, repeatPassword: String)

object SignupForm {
    implicit val signupFormMapping: Form[SignupForm] = Form(mapping(
        "login" -> nonEmptyText,
        "email" -> email,
        "password" -> nonEmptyText,
        "repeatPassword" -> nonEmptyText
    )(SignupForm.apply)(SignupForm.unapply))

    implicit val signupFailedFormMapping: Form[SignupForm] =
        signupFormMapping.withGlobalError("authorization.forms.signup.failed.message")
            .withGlobalError("authorization.forms.signup.failed.workaround.1")
            .withGlobalError("authorization.forms.signup.failed.workaround.2")
            .withGlobalError("authorization.forms.signup.failed.workaround.3")
}



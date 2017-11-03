package backend.models.authorization.forms

import play.api.data._
import play.api.data.Forms._

case class LoginForm(email: String, password: String)

object LoginForm {
    implicit val loginFormMapping: Form[LoginForm] = Form(mapping(
        "email" -> email,
        "password" -> nonEmptyText
    )(LoginForm.apply)(LoginForm.unapply))

    implicit val loginFailedFormMapping: Form[LoginForm] =
        loginFormMapping.withGlobalError("authorization.forms.login.failed.message")
            .withGlobalError("authorization.forms.login.failed.workaround.1")
            .withGlobalError("authorization.forms.login.failed.workaround.2")
}

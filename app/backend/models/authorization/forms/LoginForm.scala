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
        loginFormMapping.withGlobalError("authorization.failed.message")
            .withGlobalError("authorization.failed.workaround.1")
            .withGlobalError("authorization.failed.workaround.2")
            .withGlobalError("authorization.failed.workaround.3")
}

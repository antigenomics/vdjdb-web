package backend.models.authorization.forms

import play.api.data._
import play.api.data.Forms._

case class LoginForm(email: String, password: String)

object LoginForm {
    implicit val loginFormMapping: Form[LoginForm] = Form(mapping(
        "email" -> email,
        "password" -> nonEmptyText
    )(LoginForm.apply)(LoginForm.unapply))
}

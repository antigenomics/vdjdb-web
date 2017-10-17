package backend.models.authorization.forms

import backend.models.form.Form

case class LoginForm(var email: String = "", var password: String = "") extends Form

object LoginForm {
    def createEmpty: LoginForm = LoginForm()

    def createFromBodyRequest(body: Map[String, Seq[String]]): LoginForm = {
        val form = LoginForm()
        Form.validateField("email", body) match {
            case Some(email) => form.email = email
            case None => form.addErrorMessage("", "Invalid email")
        }

        Form.validateField("password", body) match {
            case Some(password) => form.password = password
            case None => form.addErrorMessage("", "Invalid password")
        }

        form.addErrorMessage("asd", "asd")
        form
    }
}

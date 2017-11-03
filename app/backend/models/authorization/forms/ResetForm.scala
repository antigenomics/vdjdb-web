package backend.models.authorization.forms

import play.api.data._
import play.api.data.Forms._

case class ResetForm(email: String)

object ResetForm {
    implicit val resetFormMapping: Form[ResetForm] = Form(mapping(
        "email" -> email
    )(ResetForm.apply)(ResetForm.unapply))
}

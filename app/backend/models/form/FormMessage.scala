package backend.models.form

import backend.models.form.FormMessageType.FormMessageType

object FormMessageType extends Enumeration {
    type FormMessageType = Value
    val SUCCESS: FormMessageType = Value("success")
    val INFO: FormMessageType = Value("info")
    val WARNING: FormMessageType = Value("warning")
    val ERROR: FormMessageType = Value("error")
}

case class FormMessage(title: String, message: String, messageType: FormMessageType)

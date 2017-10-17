package backend.models.form

import scala.collection.mutable.ListBuffer

class Form {
    final private var _messages: ListBuffer[FormMessage] = ListBuffer[FormMessage]()
    final private var _hasMessages: Boolean = false
    final private var _hasWarnings: Boolean = false
    final private var _hasErrors: Boolean = false

    def addSuccessMessage(title: String, message: String): Unit = {
        _messages += FormMessage(title, message, FormMessageType.SUCCESS)
        _hasMessages = true
    }

    def addInfoMessage(title: String, message: String): Unit = {
        _messages += FormMessage(title, message, FormMessageType.INFO)
        _hasMessages = true
    }

    def addWarningMessage(title: String, message: String): Unit = {
        _messages += FormMessage(title, message, FormMessageType.WARNING)
        _hasMessages = true
        _hasWarnings = true
    }

    def addErrorMessage(title: String, message: String): Unit = {
        _messages += FormMessage(title, message, FormMessageType.ERROR)
        _hasMessages = true
        _hasErrors = true
    }

    def getMessages: Seq[FormMessage] = _messages

    def hasMessages: Boolean = _hasMessages

    def hasWarnings: Boolean = _hasWarnings

    def hasErrors: Boolean = _hasErrors
}

object Form {

    def validateField(fieldName: String, body: Map[String, Seq[String]]): Option[String] = {
        body.get(fieldName) match {
            case Some(seq) =>
                seq.headOption
            case None => None
        }
    }

}

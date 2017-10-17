package backend.controllers

import javax.inject.Inject

import backend.models.authorization.forms.LoginForm
import backend.models.authorization.user.UserProvider
import backend.utils.analytics.Analytics
import play.api.Environment
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.concurrent.{ExecutionContext, Future}

class Authorization @Inject()(cc: ControllerComponents, userProvider: UserProvider)
                             (implicit ec: ExecutionContext, environment: Environment, analytics: Analytics) extends AbstractController(cc) {

    def login: Action[AnyContent] = Action.async { implicit request =>
        Future.successful(Ok(frontend.views.html.authorization.login(LoginForm.createEmpty)))
    }

    def onLogin: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            val requestBody: Option[Map[String, Seq[String]]] = request.body.asFormUrlEncoded
            if (requestBody.nonEmpty) {
                val form = LoginForm.createFromBodyRequest(requestBody.get)
                if (form.hasErrors) {
                    println(form.getMessages)
                    Ok(frontend.views.html.authorization.login(form))
                } else {
                    Redirect("/authorization/login")
                }
            } else {
                Ok(frontend.views.html.authorization.login(LoginForm.createEmpty))
            }
        }
    }

}

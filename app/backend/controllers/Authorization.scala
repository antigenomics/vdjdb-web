package backend.controllers

import javax.inject.Inject

import backend.models.authorization.forms.LoginForm
import backend.models.authorization.user.UserProvider
import backend.utils.analytics.Analytics
import play.api.Environment
import play.api.i18n.{Lang, Langs, Messages, MessagesApi}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.concurrent.{ExecutionContext, Future}

class Authorization @Inject()(cc: ControllerComponents, userProvider: UserProvider, languages: Langs, messagesApi: MessagesApi)
                             (implicit ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

    def login: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            Ok(frontend.views.html.authorization.login(LoginForm.loginFormMapping))
        }
    }

    def onLogin: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            LoginForm.loginFormMapping.bindFromRequest.fold(
                formWithErrors => {
                    // binding failure, you retrieve the form containing errors:
                    println("Bad!")
                    BadRequest(frontend.views.html.authorization.login(formWithErrors))
                },
                form => {
                    println("Ok!")
                    /* binding success, you get the actual value. */
//                    val newUser = models.User(userData.name, userData.age)
//                    val id = models.User.create(newUser)
                    Redirect(routes.Authorization.login())
                }
            )
        }
    }

}
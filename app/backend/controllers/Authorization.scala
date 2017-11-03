package backend.controllers

import javax.inject.Inject

import backend.models.authorization.forms.{LoginForm, ResetForm, SignupForm}
import backend.models.authorization.user.UserProvider
import backend.utils.analytics.Analytics
import play.api.Environment
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.concurrent.{ExecutionContext, Future}

class Authorization @Inject()(cc: ControllerComponents, userProvider: UserProvider, messagesApi: MessagesApi)
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
                    BadRequest(frontend.views.html.authorization.login(formWithErrors))
                },
                form => {
                    println("Ok!")
                    /* binding success, you get the actual value. */
                    //                    val newUser = models.User(userData.name, userData.age)
                    //                    val id = models.User.create(newUser)
                    BadRequest(frontend.views.html.authorization.login(LoginForm.loginFailedFormMapping))
                }
            )
        }
    }

    def signup: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            Ok(frontend.views.html.authorization.signup(SignupForm.signupFormMapping))
        }
    }

    def onSignup: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            SignupForm.signupFormMapping.bindFromRequest.fold(
                formWithErrors => {
                    BadRequest(frontend.views.html.authorization.signup(formWithErrors))
                },
                form => {
                    BadRequest(frontend.views.html.authorization.signup(SignupForm.signupFailedFormMapping))
                }
            )
        }
    }

    def reset: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            Ok(frontend.views.html.authorization.reset(ResetForm.resetFormMapping))
        }
    }

    def onReset: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            ResetForm.resetFormMapping.bindFromRequest.fold(
                formWithErrors => {
                    BadRequest(frontend.views.html.authorization.reset(formWithErrors))
                },
                form => {
                    Redirect(backend.controllers.routes.Authorization.reset()).flashing("message" -> "authorization.forms.reset.flashing.message")
                }
            )
        }
    }

}

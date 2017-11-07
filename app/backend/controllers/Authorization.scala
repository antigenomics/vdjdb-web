package backend.controllers

import javax.inject.Inject

import scala.async.Async.{async, await}
import backend.models.authorization.forms.{LoginForm, ResetForm, SignupForm}
import backend.models.authorization.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.authorization.verification.VerificationTokenProvider
import backend.utils.analytics.Analytics
import play.api.Environment
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class Authorization @Inject()(cc: ControllerComponents, userProvider: UserProvider, vtp: VerificationTokenProvider,
                              sessionTokenProvider: SessionTokenProvider, messagesApi: MessagesApi)
                             (implicit ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val AUTH_TOKEN_SESSION_NAME = "auth_token"
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

    def getAuthTokenSessionName: String = AUTH_TOKEN_SESSION_NAME

    def allowIfNotLogged(fallback : Result)(implicit request: Request[AnyContent]): Future[Result] = async {
        val sessionToken = await(sessionTokenProvider.get(request.session.get(AUTH_TOKEN_SESSION_NAME).getOrElse("")))
        if (sessionToken.nonEmpty) {
            val user = await(userProvider.get(sessionToken.get.userID))
            if (user.nonEmpty) {
                Redirect(backend.controllers.routes.Application.index())
            } else {
                fallback
            }
        } else {
            fallback
        }
    }

    def login: Action[AnyContent] = Action.async { implicit request =>
        allowIfNotLogged {
            Ok(frontend.views.html.authorization.login(LoginForm.loginFormMapping))
        }
    }

    def onLogin: Action[AnyContent] = Action.async { implicit request =>
        LoginForm.loginFormMapping.bindFromRequest.fold(
            formWithErrors => {
                Future.successful(BadRequest(frontend.views.html.authorization.login(formWithErrors)))
            },
            form => {
                userProvider.get(form.email).flatMap {
                    case Some(user) => async {
                        if (user.verified) {
                            val token = await(sessionTokenProvider.createSessionToken(user))
                            Redirect(backend.controllers.routes.Application.index()).withSession(request.session + (AUTH_TOKEN_SESSION_NAME, token))
                        } else {
                            BadRequest(frontend.views.html.authorization.login(LoginForm.loginUnverified))
                        }
                    }
                    case None => Future.successful(BadRequest(frontend.views.html.authorization.login(LoginForm.loginFailedFormMapping)))
                }
            }
        )
    }

    def signup: Action[AnyContent] = Action.async { implicit request =>
        allowIfNotLogged {
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
        allowIfNotLogged {
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

    def verify(token: String): Action[AnyContent] = Action.async {
        async {
            val verificationToken = await(vtp.get(token))
            if (verificationToken.isEmpty) {
                BadRequest(messages("authorization.verification.invalidToken"))
            } else {
                val user = await(userProvider.verifyUser(verificationToken.get.token))
                if (user.nonEmpty) {
                    Redirect(backend.controllers.routes.Authorization.login()).flashing("verified" -> "authorization.forms.login.flashing.verified")
                } else {
                    BadRequest("")
                }
            }
        }
    }
}

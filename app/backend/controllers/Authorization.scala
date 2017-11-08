package backend.controllers

import javax.inject.Inject

import scala.async.Async.{async, await}
import backend.models.authorization.forms.{LoginForm, ResetForm, SignupForm}
import backend.models.authorization.session.SessionTokenProvider
import backend.models.authorization.user.UserProvider
import backend.models.authorization.verification.VerificationTokenProvider
import backend.utils.analytics.Analytics
import org.slf4j.LoggerFactory
import play.api.Environment
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc._
import backend.actions.{AuthorizedOnlyAction, UnauthorizedOnlyAction}
import backend.server.session.SessionGuard

import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future}

class Authorization @Inject()(cc: ControllerComponents, messagesApi: MessagesApi,
                              up: UserProvider, vtp: VerificationTokenProvider, stp: SessionTokenProvider,
                              authorizedOnly: AuthorizedOnlyAction, unauthorizedOnly: UnauthorizedOnlyAction)
                             (implicit ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

    def login: Action[AnyContent] = unauthorizedOnly { implicit request =>
        Ok(frontend.views.html.authorization.login(LoginForm.loginFormMapping))
    }

    def onLogin: Action[AnyContent] = Action.async { implicit request =>
        LoginForm.loginFormMapping.bindFromRequest.fold(
            formWithErrors => async {
                BadRequest(frontend.views.html.authorization.login(formWithErrors))
            },
            form => {
                up.get(form.email).flatMap {
                    case Some(user) => async {
                        if (user.verified) {
                            if (user.checkPassword(form.password)) {
                                val sessionToken = await(stp.createSessionToken(user))
                                Redirect(backend.controllers.routes.Application.index())
                                    .withSession(request.session + (stp.getAuthTokenSessionName, sessionToken))
                            } else {
                                BadRequest(frontend.views.html.authorization.login(LoginForm.loginFailedFormMapping))
                            }
                        } else {
                            BadRequest(frontend.views.html.authorization.login(LoginForm.loginUnverified))
                        }
                    }
                    case None => Future.successful(BadRequest(frontend.views.html.authorization.login(LoginForm.loginFailedFormMapping)))
                }
            }
        )
    }

    def signup: Action[AnyContent] = unauthorizedOnly { implicit request =>
        Ok(frontend.views.html.authorization.signup(SignupForm.signupFormMapping))
    }

    def onSignup: Action[AnyContent] = Action.async { implicit request =>
        SignupForm.signupFormMapping.bindFromRequest.fold(
            formWithErrors => async {
                BadRequest(frontend.views.html.authorization.signup(formWithErrors))
            },
            form => async {
                val check = await(up.get(form.email))
                if (check.nonEmpty) {
                    BadRequest(frontend.views.html.authorization.signup(SignupForm.userAlreadyExistsFormMapping))
                } else {
                    val verificationToken = await(up.createUser(form))
                    if (up.isVerificationRequired) {
                        //TODO verification email
                        logger.info(s"Verification token for ${form.email}: ${verificationToken.token}")
                        Redirect(backend.controllers.routes.Authorization.login()).flashing("created" -> "authorization.forms.signup.success.created")
                    } else {
                        val _ = await(up.verifyUser(verificationToken))
                        Redirect(backend.controllers.routes.Authorization.login()).flashing("created" -> "authorization.forms.signup.success.createdAndVerified")
                    }
                }
            }
        )
    }

    def reset: Action[AnyContent] = unauthorizedOnly { implicit request =>
        Ok(frontend.views.html.authorization.reset(ResetForm.resetFormMapping))
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
                val user = await(up.verifyUser(verificationToken.get.token))
                if (user.nonEmpty) {
                    Redirect(backend.controllers.routes.Authorization.login()).flashing("verified" -> "authorization.forms.login.flashing.verified")
                } else {
                    BadRequest("")
                }
            }
        }
    }

    def logout: Action[AnyContent] = authorizedOnly { implicit request =>
        //todo wait?
        val token = Await.result(stp.get(request.session.get(stp.getAuthTokenSessionName).getOrElse("")), Duration.Inf)
        if (token.nonEmpty) {
            Await.ready(stp.delete(token.get.token), Duration.Inf)
        }
        SessionGuard.clearSessionAndDiscardCookies(Redirect(backend.controllers.routes.Application.index()), request)
    }
}

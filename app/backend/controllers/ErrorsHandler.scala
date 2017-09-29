package backend.controllers

import javax.inject._

import play.api.http.DefaultHttpErrorHandler
import play.api._
import play.api.mvc._
import play.api.mvc.Results._
import play.api.routing.Router
import scala.concurrent._

@Singleton
class ErrorsHandler @Inject()(env: Environment, config: Configuration,
                              sourceMapper: OptionalSourceMapper, router: Provider[Router])
    extends DefaultHttpErrorHandler(env, config, sourceMapper, router) {

    override def onProdServerError(request: RequestHeader, exception: UsefulException): Future[Result] = {
        Future.successful(
            InternalServerError("A server error occurred: " + exception.getMessage)
        )
    }

    override def onForbidden(request: RequestHeader, message: String): Future[Result] = {
        Future.successful(
            Forbidden("You're not allowed to access this resource.")
        )
    }

    override def onNotFound(request: RequestHeader, message: String): Future[Result] = {
        Future.successful(Ok(frontend.views.html.notFound(env)))
    }
}
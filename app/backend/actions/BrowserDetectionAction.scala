package backend.actions

import javax.inject.Inject

import eu.bitwalker.useragentutils.UserAgent
import play.api.libs.typedmap.TypedKey
import play.api.mvc._
import play.mvc.Http

import scala.concurrent.{ExecutionContext, Future}

class BrowserDetectionAction @Inject()(parser: BodyParsers.Default)(implicit ec: ExecutionContext) extends ActionBuilderImpl(parser) {
    override def invokeBlock[A](request: Request[A], block: (Request[A]) => Future[Result]): Future[Result] = {
        block(request.addAttr(BrowserDetectionAction.BROWSER_TYPED_KEY, UserAgent.parseUserAgentString(request.headers.get(Http.HeaderNames.USER_AGENT).getOrElse(""))))
    }
}

object BrowserDetectionAction {
    final val BROWSER_TYPED_KEY = TypedKey[UserAgent]("Browser")
}

package backend.controllers

import javax.inject.Inject

import backend.authorization.models.user.UserProvider
import backend.utils.CommonUtils
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.concurrent.{ExecutionContext, Future}

class Authorization @Inject()(cc: ControllerComponents, userProvider: UserProvider)(implicit ec: ExecutionContext) extends AbstractController(cc) {

    def login: Action[AnyContent] = Action.async {
        userProvider.getAll.map(_.toString()).onComplete(s => println(s))
        userProvider.addUser(CommonUtils.randomAlphaNumericString(5), CommonUtils.randomAlphaNumericString(5)).onComplete(println)
        Future.successful(Ok("priv"))
    }

}

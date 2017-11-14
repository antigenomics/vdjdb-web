/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.controllers

import javax.inject.Inject

import backend.actions.{SessionAction, UserRequestAction}
import backend.models.authorization.forms.ChangeForm
import backend.utils.analytics.Analytics
import org.slf4j.LoggerFactory
import play.api.Environment
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.concurrent.ExecutionContext

class Account @Inject()(cc: ControllerComponents, messagesApi: MessagesApi, userRequestAction: UserRequestAction)
                       (implicit ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))


    def details: Action[AnyContent] = (userRequestAction andThen SessionAction.authorizedOnly) { implicit request =>
        Ok(frontend.views.html.authorization.details(ChangeForm.changeFormMapping, request.user.get.getDetails))
    }

    def changePassword: Action[AnyContent] = (userRequestAction andThen SessionAction.authorizedOnly) { implicit request =>
        NotImplemented("Not implemented")
    }
}

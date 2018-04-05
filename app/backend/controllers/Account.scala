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
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.UserProvider
import backend.models.files.sample.SampleFileProvider
import backend.models.files.sample.tags.SampleTagProvider
import backend.utils.analytics.Analytics
import org.slf4j.LoggerFactory
import play.api.Environment
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.async.Async.{async, await}
import scala.concurrent.ExecutionContext

class Account @Inject()(cc: ControllerComponents, messagesApi: MessagesApi, userRequestAction: UserRequestAction)
                       (implicit upp: UserPermissionsProvider, up: UserProvider, sfp: SampleFileProvider, stp: SampleTagProvider,
                        ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

    def detailsPage: Action[AnyContent] = (userRequestAction andThen SessionAction.authorizedOnly) { implicit request =>
        Ok(frontend.views.html.authorization.details(ChangeForm.changeFormMapping, request.details.get))
    }

    def changePassword: Action[AnyContent] = (userRequestAction andThen SessionAction.authorizedOnly).async { implicit request =>
        ChangeForm.changeFormMapping.bindFromRequest.fold(
            formWithErrors => async {
                BadRequest(frontend.views.html.authorization.details(formWithErrors, request.details.get))
            },
            form => async {
                val user = request.user.get
                if (user.checkPassword(form.oldPassword)) {
                    val _ = await(up.updatePassword(user, form.newPassword))
                    Redirect(backend.controllers.routes.Account.detailsPage()).flashing("changed" -> "account.change.password.success")
                } else {
                    BadRequest(frontend.views.html.authorization.details(
                        ChangeForm.invalidOldPasswordChangeFormMapping,
                        await(request.user.get.getDetails)
                    ))
                }
            }
        )
    }
}

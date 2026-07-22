/*
 *     Copyright 2017-2019 Bagaev Dmitry
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

import backend.actions.{SessionAction, UserRequestAction}
import backend.models.authorization.forms.ChangeForm
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.UserProvider
import backend.models.files.sample.SampleFileProvider
import backend.models.files.sample.tags.SampleTagProvider
import backend.models.files.sample.SampleRetentionProvider
import backend.models.usage.UsageProvider
import backend.server.annotations.api.user.AccountLimits
import backend.utils.analytics.Analytics
import javax.inject.Inject
import org.slf4j.LoggerFactory
import play.api.{Configuration, Environment}
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.async.Async.{async, await}
import scala.concurrent.ExecutionContext

class Account @Inject()(cc: ControllerComponents, messagesApi: MessagesApi, userRequestAction: UserRequestAction,
                        conf: Configuration, usage: UsageProvider, retention: SampleRetentionProvider)
                       (implicit upp: UserPermissionsProvider, up: UserProvider, sfp: SampleFileProvider, stp: SampleTagProvider,
                        ec: ExecutionContext, environment: Environment, analytics: Analytics)
  extends AbstractController(cc) {
  private final val logger = LoggerFactory.getLogger(this.getClass)
  implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

  /** The same numbers the annotate page reports, from the same [[AccountLimits]] - two pages quoting a
    * user's own limits from two sources is how they end up disagreeing. */
  private def limitsFor(request: backend.actions.UserRequest[_]): AccountLimits =
    AccountLimits(request.user.get.isTemporary, request.details.get.permissions, conf,
      usage.getConfiguration, retention.getConfiguration)

  def detailsPage: Action[AnyContent] = (userRequestAction andThen SessionAction.authorizedOnly) { implicit request =>
    Ok(frontend.views.html.authorization.details(ChangeForm.changeFormMapping, request.details.get, limitsFor(request)))
  }

  def changePassword: Action[AnyContent] = (userRequestAction andThen SessionAction.authorizedOnly).async { implicit request =>
    ChangeForm.changeFormMapping.bindFromRequest.fold(
      formWithErrors => async {
        BadRequest(frontend.views.html.authorization.details(formWithErrors, request.details.get, limitsFor(request)))
      },
      form => async {
        val user = request.user.get
        // The form is hidden in the view for accounts without this permission, but the POST was never
        // gated — a demo/temporary user could change their password by posting directly.
        if (!request.details.get.permissions.isChangePasswordAllowed) {
          Forbidden(frontend.views.html.authorization.details(
            ChangeForm.changeFormMapping.withGlobalError("account.change.password.notAllowed"),
            request.details.get, limitsFor(request)
          ))
        } else if (user.checkPassword(form.oldPassword)) {
          val _ = await(up.updatePassword(user, form.newPassword))
          Redirect(backend.controllers.routes.Account.detailsPage()).flashing("changed" -> "account.change.password.success")
        } else {
          BadRequest(frontend.views.html.authorization.details(
            ChangeForm.invalidOldPasswordChangeFormMapping,
            await(request.user.get.getDetails), limitsFor(request)
          ))
        }
      }
    )
  }
}

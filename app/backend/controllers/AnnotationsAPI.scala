/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.controllers

import javax.inject.Inject

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.actions.{SessionAction, UserRequest, UserRequestAction}
import backend.actors.{AnnotationsWebSocketActor, MultisampleAnalysisWebSocketActor}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.UserProvider
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.{SampleFileForm, SampleFileProvider}
import backend.server.database.Database
import backend.server.limit.RequestLimits
import backend.utils.analytics.Analytics
import com.typesafe.config.ConfigMemorySize
import org.apache.commons.io.FilenameUtils
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.{Configuration, Environment}
import play.api.libs.Files
import play.api.libs.json.JsValue
import play.api.libs.streams.ActorFlow
import play.api.mvc._

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}

class AnnotationsAPI @Inject()(cc: ControllerComponents, userRequestAction: UserRequestAction,
                               conf: Configuration, messagesApi: MessagesApi, database: Database)
                              (implicit upp: UserPermissionsProvider, up: UserProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider,
                               as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits,
                               environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val maxUploadFileSize = conf.get[ConfigMemorySize]("application.annotations.upload.maxFileSize")
    implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

    def checkUploadAllowed(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
        override protected def executionContext: ExecutionContext = ec

        override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
            val details = request.details.get
            if (!details.permissions.isUploadAllowed) {
                Some(BadRequest("Upload is not allowed for this account"))
                val filesCount = details.files.length
                if (details.permissions.maxFilesCount >= 0 && filesCount >= details.permissions.maxFilesCount) {
                    Some(BadRequest("Max files count limit have been exceeded"))
                } else {
                    None
                }
            } else {
                None
            }
        }
    }

    def uploadFile: Action[MultipartFormData[Files.TemporaryFile]] =
        (userRequestAction(parse.multipartFormData(maxUploadFileSize.toBytes)) andThen SessionAction.authorizedOnly andThen checkUploadAllowed).async {
            implicit request =>
                SampleFileForm.sampleFileFormMapping.bindFromRequest.fold(
                    formWithErrors => async {
                        val error = formWithErrors.errors.head
                        val message = messages(error.message)
                        if (message.contains("required")) {
                            BadRequest(s"${error.key.capitalize} field is missing")
                        } else {
                            BadRequest(message)
                        }
                    },
                    form => {
                        request.body.file("file").fold(ifEmpty = Future.successful(BadRequest("File is empty"))) { file =>
                            val name = FilenameUtils.getBaseName(form.name)
                            val extension = FilenameUtils.getExtension(form.name)
                            val software = form.software
                            request.user.get.addSampleFile(name, extension, software, file.ref).map {
                                case Left(sampleFileID) =>
                                    Ok(s"$sampleFileID")
                                case Right(error) =>
                                    file.ref.delete()
                                    BadRequest(error)
                            }
                        }
                    }
                )
        }

    def connect: WebSocket = WebSocket.acceptOrResult[JsValue, JsValue] { implicit request =>
        async {
            if (limits.allowConnection(request)) {
                request.session.get(up.getAuthTokenSessionName) match {
                    case None => Left(Forbidden)
                    case Some(token) =>
                        val user = await(up.getBySessionToken(token))
                        if (user.nonEmpty) {
                            val details = await(user.get.getDetails)
                            Right(ActorFlow.actorRef { out =>
                                AnnotationsWebSocketActor.props(out, limits.getLimit(request), user.get, details, database)
                            })
                        } else {
                            Left(Forbidden)
                        }
                }
            } else {
                Left(Forbidden)
            }
        }
    }

    def multisample: WebSocket = WebSocket.acceptOrResult[JsValue, JsValue] { implicit request =>
        async {
            if (limits.allowConnection(request)) {
                request.session.get(up.getAuthTokenSessionName) match {
                    case None => Left(Forbidden)
                    case Some(token) =>
                        val user = await(up.getBySessionToken(token))
                        if (user.nonEmpty) {
                            val details = await(user.get.getDetails)
                            Right(ActorFlow.actorRef { out =>
                                MultisampleAnalysisWebSocketActor.props(out, limits.getLimit(request), user.get, details, database)
                            })
                        } else {
                            Left(Forbidden)
                        }
                }
            } else {
                Left(Forbidden)
            }
        }
    }
}

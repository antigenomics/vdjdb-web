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

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.actions.{SessionAction, UserRequest, UserRequestAction}
import backend.actors.{AnnotationsWebSocketActor, MultisampleAnalysisWebSocketActor}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.UserProvider
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.tags.SampleTagProvider
import backend.models.files.sample.{SampleFileForm, SampleFileProvider, SampleFileTable}
import backend.models.files.temporary.TemporaryFileProvider
import backend.server.database.Database
import backend.server.limit.RequestLimits
import backend.utils.analytics.Analytics
import backend.utils.files.{DecompressionLimitException, DecompressionLimits, FileUtils}
import com.typesafe.config.ConfigMemorySize
import javax.inject.Inject
import org.apache.commons.io.FilenameUtils
import play.api.i18n.{Lang, Messages, MessagesApi}
import play.api.libs.Files
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.libs.streams.ActorFlow
import play.api.mvc._
import play.api.{Configuration, Environment}

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}

class AnnotationsAPI @Inject()(cc: ControllerComponents, userRequestAction: UserRequestAction,
                               conf: Configuration, messagesApi: MessagesApi, database: Database)
                              (implicit upp: UserPermissionsProvider, up: UserProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider,
                               tfp: TemporaryFileProvider, stp: SampleTagProvider,
                               as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits,
                               environment: Environment, analytics: Analytics)
  extends AbstractController(cc) {
  private final val maxUploadFileSize = conf.get[ConfigMemorySize]("application.annotations.upload.maxFileSize")
  private final val decompressionLimits = DecompressionLimits(
    maxBytes = conf.get[ConfigMemorySize]("application.annotations.upload.maxDecompressedSize").toBytes,
    maxRatio = conf.get[Long]("application.annotations.upload.maxCompressionRatio")
  )
  private final val demoFilesLocation = conf.get[String]("application.auth.demo.filesLocation")
  implicit val messages: Messages = messagesApi.preferred(Seq(Lang.defaultLang))

  /** Demo samples are public showcase data; serving them unauthenticated is the point — a prospective
    * user should be able to see the expected input format before creating an account. */
  def demoSamples: Action[AnyContent] = Action {
    val files = FileUtils.getDirectoryFiles(demoFilesLocation).sortBy(_.getName)
    Ok(JsArray(files.map(f => Json.obj("name" -> f.getName, "size" -> f.length()))))
  }

  def downloadDemoSample(name: String): Action[AnyContent] = Action {
    // Match against the actual directory listing instead of building a path from `name`; anything
    // that concatenates user input into a file path is a traversal (../../etc/passwd) waiting to happen.
    FileUtils.getDirectoryFiles(demoFilesLocation).find(_.getName == name) match {
      case Some(file) => Ok.sendFile(file, inline = false)
      case None       => NotFound("Unknown demo sample")
    }
  }

  def checkUploadAllowed(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
    override protected def executionContext: ExecutionContext = ec

    override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
      val details = request.details.get
      // Both branches used to fall through: the "not allowed" Some(...) was a discarded expression,
      // and the allowed branch never checked the file count at all.
      if (!details.permissions.isUploadAllowed) {
        Some(BadRequest("Upload is not allowed for this account"))
      } else if (details.permissions.maxFilesCount >= 0 && details.files.length >= details.permissions.maxFilesCount) {
        Some(BadRequest("Max files count limit have been exceeded"))
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
              val software = form.software

              val extension: String = "gz"

              if (!SampleFileTable.isSampleNameValid(name)) {
                file.ref.delete()
                Future.successful(BadRequest("Invalid file name"))
              } else {
                // Decompression happens here, so the bomb check has to happen here too — the
                // multipart cap above and the per-account quota below both measure compressed bytes.
                scala.util.Try(FileUtils.convertToGzip(file.ref, decompressionLimits)) match {
                  case scala.util.Failure(e: DecompressionLimitException) =>
                    file.ref.delete()
                    Future.successful(BadRequest(e.getMessage))
                  case scala.util.Failure(e) =>
                    file.ref.delete()
                    Future.successful(BadRequest(s"Unable to read the uploaded file: ${e.getMessage}"))
                  case scala.util.Success(gzipped) =>
                    request.user.get.addSampleFile(name, extension, software, gzipped).map {
                      case Left(sampleFileID) =>
                        Ok(s"$sampleFileID")
                      case Right(error) =>
                        file.ref.delete()
                        BadRequest(error)
                    }
                }
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

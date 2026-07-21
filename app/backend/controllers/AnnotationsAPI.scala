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
import backend.utils.files.sample.SampleConverter
import backend.utils.files.{DecompressionLimitException, DecompressionLimits, FileUtils}
import com.antigenomics.vdjtools.misc.Software
import com.typesafe.config.ConfigMemorySize
import javax.inject.Inject
import org.apache.commons.io.FilenameUtils
import org.slf4j.LoggerFactory
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
  // Read NEW keys defensively. Production runs with -Dconfig.file=<server-side file>, which REPLACES
  // the packaged application.conf, so a key added here does not exist there until someone edits that
  // file too. With conf.get a missing key throws during Guice construction and the whole app
  // crash-loops on deploy; with a default it degrades to the documented value instead.
  private final val decompressionLimits = DecompressionLimits(
    maxBytes = conf.getOptional[ConfigMemorySize]("application.annotations.upload.maxDecompressedSize")
      .map(_.toBytes).getOrElse(256L * 1024 * 1024),
    maxRatio = conf.getOptional[Long]("application.annotations.upload.maxCompressionRatio").getOrElse(100L)
  )
  private final val maxClonotypesCount =
    conf.getOptional[Long]("application.annotations.upload.maxClonotypesCount").getOrElse(200000L)
  private final val demoFilesLocation =
    conf.getOptional[String]("application.auth.demo.filesLocation").getOrElse("")
  private final val logger = LoggerFactory.getLogger(this.getClass)
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

  /** Run the uploaded file through [[SampleConverter]] and store the normalised result.
    *
    * A file carrying both chains is rejected rather than split: one upload still maps to one sample,
    * so the response contract (and the client, which re-registers the name it uploaded) is unchanged.
    * Splitting into `<name>_TRA`/`<name>_TRB` needs that contract widened and is a separate change.
    */
  private def convertAndStore(user: backend.models.authorization.user.User, name: String,
                              source: java.io.File, requestedSoftware: String): Future[Result] = {
    val prefix = java.io.File.createTempFile("vdjdb-convert-", "")
    scala.util.Try(SampleConverter.convert(source, prefix, maxClonotypesCount)) match {
      // Legacy passthrough: vdjtools already parses 8 formats the converter's alias table does not
      // cover (MiGec, ImmunoSeq, ImgtHighVQuest, Vidjil, RTCR, …). If the user explicitly selected one
      // of those, store the file untouched and let vdjtools read it, exactly as before.
      case scala.util.Failure(e: SampleConverter.ConversionException) if isLegacySoftware(requestedSoftware) =>
        logger.info(s"Sample '$name': converter declined (${e.getMessage}); storing as $requestedSoftware for vdjtools")
        user.addSampleFileFrom(name, "gz", requestedSoftware, source).map(storeResult(source))

      case scala.util.Failure(e: SampleConverter.ConversionException) =>
        Future.successful(BadRequest(e.getMessage))

      case scala.util.Failure(e) =>
        logger.warn(s"Sample conversion failed for '$name'", e)
        Future.successful(BadRequest(s"Unable to parse the uploaded file: ${e.getMessage}"))

      case scala.util.Success(report) if report.chains.lengthCompare(1) > 0 =>
        report.chains.foreach(c => { val _ = c.file.delete() })
        Future.successful(BadRequest(
          s"This file contains ${report.chains.map(_.chain).mkString(" and ")} records. A sample must be " +
            "single-chain — please upload one chain per file."))

      case scala.util.Success(report) =>
        val converted = report.chains.head
        if (report.warnings.nonEmpty) {
          logger.info(s"Sample '$name' (${report.format}, ${converted.chain}): ${report.warnings.mkString("; ")}")
        }
        // Stored normalised, so the annotate path always reads a VDJtools table regardless of input.
        user.addSampleFileFrom(name, "gz", "VDJtools", converted.file).map(storeResult(converted.file))
    }
  }

  /** vdjtools' own formats, minus the ones the converter handles natively. */
  private def isLegacySoftware(software: String): Boolean =
    software != "VDJtools" && software != "VDJtoolsRenorm" &&
      Software.values().map(_.toString).contains(software)

  private def storeResult(scratch: java.io.File)(result: Either[Long, String]): Result = {
    val _ = scratch.delete()
    result match {
      case Left(sampleFileID) => Ok(s"$sampleFileID")
      case Right(error)       => BadRequest(error)
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
                    // Normalise whatever the user sent (AIRR / MiXCR / VDJtools / plain) into the
                    // positional VDJtools table vdjtools can actually parse, and store THAT.
                    convertAndStore(request.user.get, name, gzipped.getAbsoluteFile, software)
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

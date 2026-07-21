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
import backend.models.files.sample.{SampleFileForm, SampleFileProvider, SampleFileTable, SampleRetentionProvider}
import backend.models.files.temporary.TemporaryFileProvider
import backend.models.usage.UsageProvider
import backend.server.annotations.AnnotationsScheduler
import backend.server.database.Database
import backend.server.limit.RequestLimits
import backend.server.motifs.Motifs
import backend.utils.RequestUtils
import backend.utils.analytics.Analytics
import backend.utils.files.sample.SampleConverter
import backend.utils.files.{DecompressionLimitException, DecompressionLimits, FileUtils}
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
                               conf: Configuration, messagesApi: MessagesApi, database: Database, motifs: Motifs,
                               usage: UsageProvider, retention: SampleRetentionProvider, scheduler: AnnotationsScheduler)
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

  // SampleRetentionProvider starts its sweeper from its own constructor, and Guice only builds a
  // @Singleton when something actually depends on it — nothing else does, so without this injection
  // the sweeper would never run. This controller is the annotations entry point and is instantiated
  // by the router at startup, which makes it the place where that dependency is honest.
  logger.info(s"Annotations retention policy: ${retention.getConfiguration.describe}")

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

  /** Daily upload quota, per account and per client address.
    *
    * Orthogonal to `checkUploadAllowed` above: that one caps how many samples may be *stored* at
    * once, which an uploader defeats simply by deleting between uploads. It is also orthogonal to
    * the `play.filters.limits` IP filter, which bounds a short request window rather than a day.
    *
    * The address comes from [[RequestUtils.clientIp]], never from a raw `X-Forwarded-For`: this app
    * sits behind a reverse proxy, and a limit keyed on a header the caller controls is not a limit.
    */
  def checkUploadQuota(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
    override protected def executionContext: ExecutionContext = ec

    override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = Future.successful {
      usage
        .checkUpload(request.user.get, request.details.get.permissions, RequestUtils.clientIp(request))
        .map(message => TooManyRequests(message))
    }
  }

  /** Run the uploaded file through [[SampleConverter]] and store the normalised result.
    *
    * A file carrying both chains becomes two samples, `<name>_TRA` and `<name>_TRB`. A single-chain
    * file keeps its bare name — suffixing those too would silently rename every ordinary upload.
    *
    * Because one upload can now produce two samples, the response carries what was actually created
    * instead of a bare id: the client can no longer assume it knows the stored name.
    */
  private def convertAndStore(user: backend.models.authorization.user.User, name: String, source: java.io.File,
                              species: String, chain: String): Future[Result] = {
    val prefix = java.io.File.createTempFile("vdjdb-convert-", "")
    scala.util.Try(SampleConverter.convert(source, prefix, maxClonotypesCount)) match {
      case scala.util.Failure(e: SampleConverter.ConversionException) =>
        val _ = prefix.delete()
        Future.successful(BadRequest(e.getMessage))

      case scala.util.Failure(e) =>
        logger.warn(s"Sample conversion failed for '$name'", e)
        val _ = prefix.delete()
        Future.successful(BadRequest(s"Unable to parse the uploaded file: ${e.getMessage}"))

      case scala.util.Success(report) =>
        if (report.warnings.nonEmpty) {
          logger.info(s"Sample '$name' (${report.format}, ${report.chains.map(_.chain).mkString("+")}): ${report.warnings.mkString("; ")}")
        }
        // Declaring a chain is an assertion about the file, not a hint: keep only that chain's rows and
        // never split. Splitting is what "Guess" means, and only Guess.
        val guessing = chain == SampleFileForm.GuessChain
        val selected = if (guessing) report.chains else report.chains.filter(_.chain == chain)
        val split    = guessing && selected.lengthCompare(1) > 0
        val planned  = selected.map(c => (if (split) s"${name}_${c.chain}" else name, c))
        // Every converted file is removed, including the chains the declaration discarded.
        val cleanup = () => {
          report.chains.foreach(c => { val _ = c.file.delete() })
          val _ = prefix.delete()
        }

        if (planned.isEmpty) {
          cleanup()
          val found = report.chains.map(_.chain).mkString(" and ")
          Future.successful(BadRequest(
            s"You selected $chain, but this file contains only $found records. " +
              "Select the matching chain, or choose Guess to derive it from the data."))
        } else {

        // Everything is checked before anything is written, so a split either produces both samples or
        // none. Storing one and then failing the second would leave the account holding half a sample.
        preflight(user, planned.map(_._1)) flatMap {
          case Some(error) =>
            cleanup()
            Future.successful(BadRequest(error))
          case None =>
            // Sequential, not parallel: addSampleFileFrom re-reads the sample list and re-checks the
            // quota on every call, so concurrent inserts race both checks. Written with flatMap because
            // scala.async cannot await inside a closure.
            // The accumulator keeps what was already stored even on failure, so a half-finished split
            // can be undone rather than left in the account.
            val stored = planned.foldLeft(Future.successful[(Seq[StoredSample], Option[String])]((Seq.empty, None))) {
              case (acc, (sampleName, converted)) => acc.flatMap {
                case done @ (_, Some(_)) => Future.successful(done)
                case (done, None)        =>
                  // Stored normalised, so the annotate path always reads a VDJtools table.
                  user.addSampleFileFrom(sampleName, "gz", "VDJtools", species, converted.chain, converted.file).map {
                    case Left(id)     => (done :+ StoredSample(id, sampleName, converted.chain, species, "VDJtools", converted.clonotypes), None)
                    case Right(error) => (done, Some(error))
                  }
              }
            }
            stored.flatMap {
              case (samples, None) =>
                cleanup()
                Future.successful(storedOk(samples))
              case (samples, Some(error)) =>
                cleanup()
                rollback(user, samples.map(_.name)).map(_ => BadRequest(error))
            }
          }
        }
    }
  }

  /** Always an array, one element per sample created, so the client never has to guess whether an
    * upload was split. */
  private def storedOk(samples: Seq[StoredSample]): Result =
    Ok(Json.obj("samples" -> JsArray(samples.map(s => Json.obj(
      "id" -> s.id, "name" -> s.name, "chain" -> s.chain, "species" -> s.species,
      "software" -> s.software, "clonotypes" -> s.clonotypes)))))

  /** Reject a split before writing anything, for the reasons only visible once names are derived:
    * `_TRA` costs four characters against a 40-character name limit, and a split consumes two slots of
    * the account quota rather than one. */
  private def preflight(user: backend.models.authorization.user.User, names: Seq[String]): Future[Option[String]] = {
    val invalid = names.find(n => !SampleFileTable.isSampleNameValid(n))
    invalid match {
      case Some(bad) =>
        Future.successful(Some(s"This file holds both chains, so it is stored as two samples, but '$bad' " +
          "is not a valid sample name — please shorten the name and upload again."))
      case None =>
        for {
          existing    <- user.getSampleFiles
          permissions <- user.getPermissions
        } yield {
          val clash = names.find(n => existing.exists(_.sampleName == n))
          if (clash.nonEmpty) {
            Some(s"Sample file ${clash.get} already exist")
          } else if (permissions.maxFilesCount >= 0 && existing.length + names.length > permissions.maxFilesCount) {
            Some(s"Storing ${names.length} samples would exceed the ${permissions.maxFilesCount}-sample limit")
          } else {
            None
          }
        }
    }
  }

  private def rollback(user: backend.models.authorization.user.User, names: Seq[String]): Future[Unit] =
    Future.sequence(names.map(n => sfp.deleteForUser(user, n))).map(_ => ())

  def uploadFile: Action[MultipartFormData[Files.TemporaryFile]] =
    (userRequestAction(parse.multipartFormData(maxUploadFileSize.toBytes)) andThen SessionAction.authorizedOnly
      andThen checkUploadAllowed andThen checkUploadQuota).async {
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
                    convertAndStore(request.user.get, name, gzipped.getAbsoluteFile, form.species, form.chain)
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
                AnnotationsWebSocketActor.props(out, limits.getLimit(request), user.get, details, database, motifs, usage, scheduler)
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
                MultisampleAnalysisWebSocketActor.props(out, limits.getLimit(request), user.get, details, database, usage, scheduler)
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

/** One stored sample, as reported back to the uploader.
  *
  * Deliberately file-scoped rather than nested in the controller: as an inner class its synthetic
  * `equals` performs a type test that carries an unverifiable outer reference, which `-Xfatal-warnings`
  * turns into a build failure.
  */
private final case class StoredSample(id: Long, name: String, chain: String, species: String,
                                      software: String, clonotypes: Long)

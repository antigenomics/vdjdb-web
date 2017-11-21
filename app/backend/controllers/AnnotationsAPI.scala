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

import java.nio.file.Paths
import javax.inject.Inject

import backend.actions.{SessionAction, UserRequest, UserRequestAction}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.utils.analytics.Analytics
import com.typesafe.config.ConfigMemorySize
import org.slf4j.LoggerFactory
import play.api.{Configuration, Environment}
import play.api.libs.Files
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class AnnotationsAPI @Inject()(cc: ControllerComponents, userRequestAction: UserRequestAction, conf: Configuration)
                              (implicit upp: UserPermissionsProvider,
                               ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val maxUploadFileSize = conf.get[ConfigMemorySize]("application.annotations.upload.maxFileSize")
    private final val logger = LoggerFactory.getLogger(this.getClass)

    def checkUploadAllowed(implicit ec: ExecutionContext): ActionFilter[UserRequest] = new ActionFilter[UserRequest] {
        override protected def executionContext: ExecutionContext = ec
        override protected def filter[A](request: UserRequest[A]): Future[Option[Result]] = {
            request.user.get.getDetails.map { details =>
                if (!details.permissions.isUploadAllowed) {
                    Some(BadRequest("Upload is not allowed for this account"))
                } else {
                    None
                }
            }
        }
    }

    def uploadFile: Action[MultipartFormData[Files.TemporaryFile]] =
        (userRequestAction(parse.multipartFormData(maxUploadFileSize.toBytes)) andThen SessionAction.authorizedOnly andThen checkUploadAllowed) {
            implicit request =>
                request.body.file("file").map { file =>
                    logger.info(s"File uploaded ${file.filename} from user ${request.user.get.login}")
                    try {
                        file.ref.moveTo(Paths.get(s"/tmp/play/${file.filename}"), replace = true)
                        Ok("Uploaded")
                    } catch { case ex: Throwable =>
                        logger.error(s"Upload error: ${ex.toString}")
                        BadRequest("Internal server error")
                    }
                }.getOrElse {
                    BadRequest("Internal server error")
                }
        }

}

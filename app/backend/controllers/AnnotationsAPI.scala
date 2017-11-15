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

import backend.actions.{SessionAction, UserRequestAction}
import backend.utils.analytics.Analytics
import org.slf4j.LoggerFactory
import play.api.Environment
import play.api.libs.Files
import play.api.mvc.{AbstractController, Action, ControllerComponents, MultipartFormData}

import scala.concurrent.ExecutionContext

class AnnotationsAPI @Inject()(cc: ControllerComponents, userRequestAction: UserRequestAction)
                              (implicit ec: ExecutionContext, environment: Environment, analytics: Analytics)
    extends AbstractController(cc) {
    private final val logger = LoggerFactory.getLogger(this.getClass)

    def uploadFile: Action[MultipartFormData[Files.TemporaryFile]] =
        (userRequestAction(parse.multipartFormData(1024 * 1024 * 1024)) andThen SessionAction.authorizedOnly) {
            implicit request =>
                request.body.file("file").map { file =>
                    logger.info(s"File uploaded ${file.filename} from user ${request.user.get.login} and size")

                    // only get the last part of the filename
                    // otherwise someone can send a path like ../../home/foo/bar.txt to write to other files on the system
                    // val filename = Paths.get(picture.filename).getFileName

                    // picture.ref.moveTo(Paths.get(s"/tmp/picture/$filename"), replace = true)

                    Ok("File uploaded")
                }.getOrElse {
                    logger.info(s"Failed to upload file")
                    BadRequest("Internal server error")
                }
        }

}

/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.controllers

import java.io.File
import javax.inject._

import backend.models.files.temporary.TemporaryFileProvider
import backend.utils.analytics.Analytics
import controllers._

import scala.concurrent.ExecutionContext.Implicits.global
import play.api._
import play.api.libs.ws._
import play.api.mvc._

import scala.concurrent.Future

class Application @Inject()(ws: WSClient, assets: Assets, configuration: Configuration, cc: ControllerComponents, temporaryFileProvider: TemporaryFileProvider)
                           (implicit environment: Environment, analytics: Analytics) extends AbstractController(cc) {

    def index: Action[AnyContent] = Action.async { implicit request =>
        Future.successful {
            Ok(frontend.views.html.index())
        }
    }

    def bundle(file: String): Action[AnyContent] = if (environment.mode == Mode.Dev) Action.async { implicit request =>
        ws.url(s"http://localhost:8080/bundles/$file").get().map { response =>
            val contentType = response.headers.get("Content-Type").flatMap(_.headOption).getOrElse("application/octet-stream")
            val headers = response.headers
                .toSeq.filter(p => List("Content-Type", "Content-Length").indexOf(p._1) < 0).map(p => (p._1, p._2.mkString))
            Ok(response.body).withHeaders(headers: _*).as(contentType)
        }
    } else {
        throw new RuntimeException("Application.bundle should not be used with Production Mode")
    }

    def downloadTemporaryFile(link: String): Action[AnyContent] = Action.async { implicit request =>
        temporaryFileProvider.getTemporaryFileWithMetadata(link).flatMap {
            case Some((_, metadata)) =>
                val file = new File(metadata.path)
                Future.successful {
                    Ok.sendFile(file, inline = false, _ => metadata.getNameWithExtension, () => {
                        temporaryFileProvider.deleteTemporaryFile(link)
                    })
                }
            case None => Future.failed(new Exception("File not found"))
        }
    }
}

package backend.controllers

import java.io.File
import javax.inject._

import akka.stream.scaladsl.{FileIO, Source}
import akka.util.ByteString
import play.api.http.HttpEntity
import controllers._

import scala.concurrent.ExecutionContext.Implicits.global
import play.api._
import play.api.libs.ws._
import play.api.mvc._

class Application @Inject()(ws: WSClient, assets: Assets, environment: Environment, cc: ControllerComponents) extends AbstractController(cc) {

    def index: Action[AnyContent] = Action {
        Ok(frontend.views.html.main(environment))
    }

    def bundle(file: String): Action[AnyContent] = if (environment.mode == Mode.Dev) Action.async {
        ws.url(s"http://localhost:8080/bundles/$file").get().map { response =>
            val contentType = response.headers.get("Content-Type").flatMap(_.headOption).getOrElse("application/octet-stream")
            val headers = response.headers
                .toSeq.filter(p => List("Content-Type", "Content-Length").indexOf(p._1) < 0).map(p => (p._1, p._2.mkString))
            Ok(response.body).withHeaders(headers: _*).as(contentType)
        }
    } else {
        throw new RuntimeException("Application.bundle should not be used with Production Mode")
    }

    def downloadTemporaryFile(name: String, path: String, guard: String, hash: String) = Action {
        val invalidPath: Boolean = path.contains("..") || name.contains("..")

        if (!invalidPath) {
            val folder = new File("/tmp/" + path + "/")
            val file = new File("/tmp/" + path + "/" + name)
            val guardFile = new File("/tmp/" + path + "/." + guard)

            val temporaryExists: Boolean =
                folder.exists() && folder.isDirectory &&
                    file.exists() && !file.isDirectory &&
                    guardFile.exists() && !guardFile.isDirectory

            if (temporaryExists) {
                val hashValid: Boolean = scala.io.Source.fromFile(guardFile).getLines().toList.head.contentEquals(hash)
                if (hashValid) {
                    Ok.sendFile(content = file, fileName = _.getName, inline = false,
                        onClose = () => {
                            file.delete()
                            guardFile.delete()
                            folder.delete()
                        })
                } else {
                    BadRequest("Invalid request")
                }
            } else {
                BadRequest("Invalid request")
            }
        } else {
            BadRequest("Invalid request")
        }
    }
}

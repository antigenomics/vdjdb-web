package backend.controllers

import javax.inject._
import play.api.mvc._
import play.api.Configuration
import java.nio.file.{Files, Path, Paths}
import backend.server.database.Database
import backend.server.structures.Structures
import scala.concurrent._
import ExecutionContext.Implicits.global

@Singleton
class ImageController @Inject()(cc: ControllerComponents, db: Database, configuration: Configuration)
  extends AbstractController(cc) {

  private val baseDir: Path = Structures.resolveImageRoot(db)
  private val motifChartsDir: Path = ImageController.resolveMotifChartsRoot(configuration)

  def structure(path: String): Action[AnyContent] = Action {
    val requested = baseDir.resolve(path).normalize()
    if (!requested.startsWith(baseDir) || !Files.isRegularFile(requested)) {
      NotFound("Image not found")
    } else {
      val originalFileName = requested.getFileName.toString
      val isHtml = originalFileName.toLowerCase.endsWith(".html")
      val baseResult = if (isHtml) {
        Ok.sendPath(requested, inline = true, fileName = (_: Path) => originalFileName).as("text/html")
      } else {
        Ok.sendPath(requested, inline = true)
      }
      baseResult
    }
  }

  def motifChart(path: String): Action[AnyContent] = Action {
    val requested = motifChartsDir.resolve(path).normalize()
    if (!requested.startsWith(motifChartsDir) || !Files.isRegularFile(requested)) {
      NotFound("Motif chart not found")
    } else {
      val originalFileName = requested.getFileName.toString
      Ok.sendPath(requested, inline = true, fileName = (_: Path) => originalFileName).as("text/html")
    }
  }
}

object ImageController {
  /** Resolves the root directory for pre-built motif chart HTML files.
   *  Path is configured via application.motifCharts.path (separate from the database).
   *  Modify this function if the storage location ever changes. */
  def resolveMotifChartsRoot(configuration: Configuration): Path = {
    val path = configuration.get[String]("application.motifCharts.path")
    Paths.get(path).toAbsolutePath.normalize()
  }
}

package backend.controllers

import javax.inject._
import play.api.mvc._
import play.api.Configuration
import java.nio.file.{Files, Path, Paths}
import backend.server.database.Database
import backend.server.structures.StructureVisualizationIndex
import scala.concurrent._
// Not unused, despite appearances: Ok.sendPath takes an implicit ExecutionContext as well as
// FileMimeTypes, and unlike every other controller that streams a file this one is not constructed with
// an ExecutionContext of its own. It is only ever used to run sendPath's onClose hook, which is the
// default no-op here.
import ExecutionContext.Implicits.global

@Singleton
class ImageController @Inject()(cc: ControllerComponents, db: Database, configuration: Configuration)
  extends AbstractController(cc) {

  private val baseDir: Path = StructureVisualizationIndex.resolveRoot(db)
  private val motifChartsDir: Path = ImageController.resolveMotifChartsRoot(configuration)

  /** A single Browse view pulls dozens of these renders, and they were served with no freshness
    * directive and no validator at all, so every one of them came down again on every page load.
    * The files are written once when a model set is built and are not edited afterwards.
    *
    * A week rather than a year with `immutable`, because a model can be regenerated under the same file
    * name; the entity tag below makes the weekly revalidation a 304, so the ceiling on staleness costs
    * one conditional request, not another download. */
  private final val ImageCacheControl: String = "public, max-age=604800"

  /** Size and modification time distinguish one build of a render from another for a single stat, which
    * is what we want on a path that serves large binaries. No Last-Modified alongside it: its only real
    * job is to seed heuristic freshness where none was declared, and we declare max-age above. */
  private def entityTag(file: Path): String =
    "\"" + java.lang.Long.toHexString(Files.getLastModifiedTime(file).toMillis) + "-" +
      java.lang.Long.toHexString(Files.size(file)) + "\""

  private def isUnchanged(request: RequestHeader, etag: String): Boolean =
    request.headers.get(IF_NONE_MATCH).exists(_.split(',').exists(_.trim == etag))

  def structure(path: String): Action[AnyContent] = Action { request =>
    val requested = baseDir.resolve(path).normalize()
    if (!requested.startsWith(baseDir) || !Files.isRegularFile(requested)) {
      NotFound("Image not found")
    } else {
      val etag = entityTag(requested)
      if (isUnchanged(request, etag)) {
        NotModified.withHeaders(CACHE_CONTROL -> ImageCacheControl, ETAG -> etag)
      } else {
        val originalFileName = requested.getFileName.toString
        val isHtml = originalFileName.toLowerCase.endsWith(".html")
        val baseResult = if (isHtml) {
          Ok.sendPath(requested, inline = true, fileName = (_: Path) => originalFileName).as("text/html")
        } else {
          Ok.sendPath(requested, inline = true)
        }
        baseResult.withHeaders(CACHE_CONTROL -> ImageCacheControl, ETAG -> etag)
      }
    }
  }

  def motifChart(path: String): Action[AnyContent] = Action { request =>
    val requested = motifChartsDir.resolve(path).normalize()
    if (!requested.startsWith(motifChartsDir) || !Files.isRegularFile(requested)) {
      NotFound("Motif chart not found")
    } else {
      val etag = entityTag(requested)
      if (isUnchanged(request, etag)) {
        NotModified.withHeaders(CACHE_CONTROL -> ImageCacheControl, ETAG -> etag)
      } else {
        val originalFileName = requested.getFileName.toString
        Ok.sendPath(requested, inline = true, fileName = (_: Path) => originalFileName).as("text/html")
          .withHeaders(CACHE_CONTROL -> ImageCacheControl, ETAG -> etag)
      }
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

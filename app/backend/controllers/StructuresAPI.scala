package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.server.limit.RequestLimits
import backend.server.structures.Structures
import backend.server.structures.api.cdr3.{StructureCDR3SearchRequest, StructureCDR3SearchResult}
import backend.server.structures.api.filter.StructuresSearchTreeFilterResult
import backend.server.motifs.api.filter.MotifsSearchTreeFilter
import javax.inject._
import org.slf4j.LoggerFactory
import play.api.libs.json._
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class StructuresAPI @Inject()(
                               cc: ControllerComponents,
                               structures: Structures
                             )(implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits)
  extends AbstractController(cc) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  // metadata: unchanged (same tree shape as Motifs)
  def getMetadata: Action[AnyContent] = Action.async {
    Future.successful(Ok(Json.obj("root" -> structures.getMetadata.root)))
  }

  // filter: returns StructureSearchTreeFilterResult (same contract as motifs)
  def filter: Action[JsValue] = Action.async(parse.json) { implicit req =>
    req.body.validate[MotifsSearchTreeFilter].fold(
      e => Future.successful(BadRequest(JsError.toJson(e))),
      // The exception text is for the log, not for the browser: getMessage carries whatever the failing
      // layer put in it, which in practice means paths and internal identifiers.
      f => structures.filter(f).map { result: StructuresSearchTreeFilterResult =>
        Ok(Json.toJson(result))
      }.recover { case t =>
        logger.error("Failed to compute structures for filter", t)
        InternalServerError("Structures could not be loaded for this selection. Please try again; if it keeps failing, report it on the VDJdb-web issue tracker.")
      }
    )
  }

  def cdr3: Action[JsValue] = Action.async(parse.json) { implicit req =>
    req.body.validate[StructureCDR3SearchRequest].fold(
      e => Future.successful(BadRequest(JsError.toJson(e))),
      f => structures.cdr3(f.cdr3, f.substring, f.gene, f.top).map { result: StructureCDR3SearchResult =>
        Ok(Json.toJson(result))
      }.recover { case t =>
        logger.error("Failed to run structure CDR3 search", t)
        InternalServerError("The structure search could not be completed. Please try again; if it keeps failing, report it on the VDJdb-web issue tracker.")
      }
    )
  }
}

package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.server.limit.RequestLimits
import backend.server.structures.Structures
import backend.server.structures.api.cdr3.{StructureCDR3SearchRequest, StructureCDR3SearchResult}
import backend.server.structures.api.filter.StructuresSearchTreeFilterResult
import backend.server.motifs.api.filter.MotifsSearchTreeFilter
import javax.inject._
import play.api.libs.json._
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class StructuresAPI @Inject()(
                               cc: ControllerComponents,
                               structures: Structures
                             )(implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits)
  extends AbstractController(cc) {

  // metadata: unchanged (same tree shape as Motifs)
  def getMetadata: Action[AnyContent] = Action.async {
    Future.successful(Ok(Json.obj("root" -> structures.getMetadata.root)))
  }

  // filter: returns StructureSearchTreeFilterResult (same contract as motifs)
  def filter: Action[JsValue] = Action.async(parse.json) { implicit req =>
    req.body.validate[MotifsSearchTreeFilter].fold(
      e => Future.successful(BadRequest(JsError.toJson(e))),
      f => structures.filter(f).map { result: StructuresSearchTreeFilterResult =>
        Ok(Json.toJson(result))
      }.recover { case t => InternalServerError("An error occurred: " + t.getMessage) }
    )
  }

  def cdr3: Action[JsValue] = Action.async(parse.json) { implicit req =>
    req.body.validate[StructureCDR3SearchRequest].fold(
      e => Future.successful(BadRequest(JsError.toJson(e))),
      f => structures.cdr3(f.cdr3, f.substring, f.gene, f.top).map { result: StructureCDR3SearchResult =>
        Ok(Json.toJson(result))
      }.recover { case t => InternalServerError("An error occurred: " + t.getMessage) }
    )
  }
}

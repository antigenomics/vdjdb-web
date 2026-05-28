package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.server.motifs.Motifs
import backend.server.structures.Structures
import backend.server.validation.ValidationDB
import javax.inject._
import play.api.libs.json.{Json, OFormat}
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

import backend.server.structures.api.epitope.StructureVisualization

case class SearchAvailabilityResponse(structures: Seq[String], motifs: Seq[String],
                                      motifsTcremp: Seq[String],
                                      visualizations: Map[String, StructureVisualization],
                                      motifCidIndex: Map[String, String],
                                      motifCidIndexTcremp: Map[String, String],
                                      validationIndex: Map[String, String])

object SearchAvailabilityResponse {
  implicit val format: OFormat[SearchAvailabilityResponse] = Json.format[SearchAvailabilityResponse]
}

@Singleton
class SearchAvailabilityAPI @Inject()(cc: ControllerComponents,
                                      structures: Structures,
                                      motifs: Motifs,
                                      validation: ValidationDB)
                                     (implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext)
  extends AbstractController(cc) {

  def availability: Action[AnyContent] = Action.async {
    val structuresSet     = structures.getAvailableStructureIds.toSeq
    val motifKeys         = motifs.getAvailabilityKeys().toSeq
    val motifKeysTcremp   = motifs.getAvailabilityKeys(Some("tcremp")).toSeq
    val visualizationMap  = structures.getHtmlVisualizations
    val cidIndex          = motifs.getCidLookupIndex()
    val cidIndexTcremp    = motifs.getCidLookupIndex(Some("tcremp"))
    val validationIdx     = validation.getStatusIndex()
    Future.successful(Ok(Json.toJson(SearchAvailabilityResponse(
      structuresSet, motifKeys, motifKeysTcremp, visualizationMap, cidIndex, cidIndexTcremp, validationIdx))))
  }
}

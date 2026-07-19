package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.util.ByteString
import backend.server.motifs.Motifs
import backend.server.structures.Structures
import javax.inject._
import play.api.http.ContentTypes.JSON
import play.api.http.HeaderNames.{ACCEPT_ENCODING, CONTENT_ENCODING}
import play.api.libs.json.{Json, OFormat}
import play.api.mvc._

import scala.concurrent.ExecutionContext

import backend.server.structures.api.epitope.{StructureModelMetrics, StructureVisualization}

case class SearchAvailabilityResponse(structures: Seq[String], motifs: Seq[String],
                                      motifsTcremp: Seq[String],
                                      visualizations: Map[String, StructureVisualization],
                                      motifCidIndex: Map[String, String],
                                      motifCidIndexTcremp: Map[String, String],
                                      structureMetrics: Map[String, StructureModelMetrics])

object SearchAvailabilityResponse {
  implicit val format: OFormat[SearchAvailabilityResponse] = Json.format[SearchAvailabilityResponse]
}

@Singleton
class SearchAvailabilityAPI @Inject()(cc: ControllerComponents,
                                      structures: Structures,
                                      motifs: Motifs)
                                     (implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext)
  extends AbstractController(cc) {

  // The availability payload (~18 MB, ~3.2 MB gzipped) is assembled from static, boot-time indices —
  // every getter below rebuilds a large map (getHtmlVisualizations alone does one filesystem stat per
  // structure), then the global GzipFilter re-compresses all 18 MB on every hit (~0.7 s of the ~0.9 s
  // per-request cost, measured). Nothing changes until the app restarts, so we serialize AND gzip once
  // and serve the cached bytes. Serving with Content-Encoding: gzip makes the GzipFilter skip the
  // response (it never re-compresses an already-encoded body), so per-request CPU drops to a memcpy.
  private lazy val cachedResponse: ByteString = {
    val payload = SearchAvailabilityResponse(
      structures.getAvailableStructureIds.toSeq,
      motifs.getAvailabilityKeys().toSeq,
      motifs.getAvailabilityKeys(Some("tcremp")).toSeq,
      structures.getHtmlVisualizations,
      motifs.getCidLookupIndex(),
      motifs.getCidLookupIndex(Some("tcremp")),
      structures.getStructureMetrics)
    ByteString(Json.toBytes(Json.toJson(payload)))
  }

  private lazy val cachedResponseGzip: ByteString = {
    val bos = new java.io.ByteArrayOutputStream(cachedResponse.length / 4)
    val gz = new java.util.zip.GZIPOutputStream(bos)
    try gz.write(cachedResponse.toArray) finally gz.close()
    ByteString(bos.toByteArray)
  }

  def availability: Action[AnyContent] = Action { request =>
    if (request.headers.get(ACCEPT_ENCODING).exists(_.toLowerCase.contains("gzip")))
      Ok(cachedResponseGzip).as(JSON).withHeaders(CONTENT_ENCODING -> "gzip")
    else
      Ok(cachedResponse).as(JSON)
  }
}

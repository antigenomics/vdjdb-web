package backend.controllers

import backend.server.structures.api._

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.util.ByteString
import backend.server.motifs.Motifs
import backend.server.structures.Structures
import javax.inject._
import play.api.http.ContentTypes.JSON
import play.api.http.HeaderNames.{ACCEPT_ENCODING, CACHE_CONTROL, CONTENT_ENCODING, ETAG, IF_NONE_MATCH, VARY}
import play.api.libs.json.{Json, OFormat}
import play.api.mvc._

import scala.concurrent.ExecutionContext


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

  /** The payload changes only when the process restarts, so an hour of freshness costs nothing, and the
    * entity tag below turns the revalidation after that hour into a 304 rather than another 3.2 MB.
    *
    * Deliberately not `immutable` with a year: the URL is stable across releases, so a client that
    * cached the index just before a database reload would keep drawing evidence badges from the previous
    * release's data for as long as we told it to. An hour bounds that; the ETag is what actually removes
    * the bytes from the wire. */
  private final val AvailabilityCacheControl: String = "public, max-age=3600"

  // The availability payload (~18 MB, ~3.2 MB gzipped) is assembled from static, boot-time indices —
  // every getter below rebuilds a large map (getHtmlVisualizations alone does one filesystem stat per
  // structure), then the global GzipFilter re-compresses all 18 MB on every hit (~0.7 s of the ~0.9 s
  // per-request cost, measured). Nothing changes until the app restarts, so we serialize AND gzip once
  // and serve the cached bytes. Serving with Content-Encoding: gzip makes the GzipFilter skip the
  // response (it never re-compresses an already-encoded body), so per-request CPU drops to a memcpy.
  //
  // Only the gzipped form is kept resident. Holding the plain 18 MB as well spent that memory for the
  // whole life of the process on a path essentially nobody takes — every browser and every mainstream
  // HTTP client sends Accept-Encoding: gzip — so the plain body is inflated on demand instead. The
  // digest is taken here, while the uncompressed bytes still exist, so the ETag is never recomputed.
  private lazy val cachedAvailability: (ByteString, String) = {
    val payload = SearchAvailabilityResponse(
      structures.getAvailableStructureIds.toSeq,
      motifs.getAvailabilityKeys().toSeq,
      motifs.getAvailabilityKeys(Some("tcremp")).toSeq,
      structures.getHtmlVisualizations,
      motifs.getCidLookupIndex(),
      motifs.getCidLookupIndex(Some("tcremp")),
      structures.getStructureMetrics)
    val plain = Json.toBytes(Json.toJson(payload))
    val bos = new java.io.ByteArrayOutputStream(plain.length / 4)
    val gz = new java.util.zip.GZIPOutputStream(bos)
    try gz.write(plain) finally gz.close()
    val digest = java.security.MessageDigest.getInstance("SHA-256").digest(plain)
    (ByteString(bos.toByteArray), digest.map(b => f"${b.toInt & 0xff}%02x").mkString)
  }

  private lazy val cachedResponseGzip: ByteString = cachedAvailability._1

  // Strong validators. The gzipped and the plain body are two representations of the same resource and
  // must therefore not share an entity tag; the "-gzip" suffix is the long-standing convention for it.
  private lazy val cachedEtag: String = "\"" + cachedAvailability._2 + "\""
  private lazy val cachedEtagGzip: String = "\"" + cachedAvailability._2 + "-gzip\""

  // `lazy val`, emphatically not a `def`. Inflating per request would be roughly 45 MB of transient
  // allocation each time — a 3.2 MB array copy, a ~25 MB inflate buffer and an 18 MB result — on an
  // unauthenticated endpoint anyone can call in a loop, which is a denial of service dressed up as a
  // memory saving. Deferring it still wins what matters: an instance whose clients all send
  // Accept-Encoding: gzip (every browser does) never materialises the plain copy at all, and one that
  // does serve a curl or a script pays for it once rather than on every call.
  private lazy val plainResponse: ByteString = {
    val in = new java.util.zip.GZIPInputStream(new java.io.ByteArrayInputStream(cachedResponseGzip.toArray))
    try {
      val bos = new java.io.ByteArrayOutputStream(cachedResponseGzip.length * 8)
      val buffer = new Array[Byte](64 * 1024)
      var read = in.read(buffer)
      while (read != -1) {
        bos.write(buffer, 0, read)
        read = in.read(buffer)
      }
      ByteString(bos.toByteArray)
    } finally in.close()
  }

  def availability: Action[AnyContent] = Action { request =>
    val gzipAccepted = request.headers.get(ACCEPT_ENCODING).exists(_.toLowerCase.contains("gzip"))
    val etag = if (gzipAccepted) cachedEtagGzip else cachedEtag
    // Vary is not optional here. This action, not the GzipFilter, decides the encoding, and the filter
    // leaves an already-encoded response alone — so without Vary nothing tells a shared proxy that the
    // two bodies behind this one URL differ, and it will hand gzip bytes to a client that never asked.
    if (request.headers.get(IF_NONE_MATCH).exists(_.split(',').exists(_.trim == etag))) {
      NotModified.withHeaders(CACHE_CONTROL -> AvailabilityCacheControl, ETAG -> etag, VARY -> ACCEPT_ENCODING)
    } else if (gzipAccepted) {
      Ok(cachedResponseGzip).as(JSON).withHeaders(CACHE_CONTROL -> AvailabilityCacheControl, ETAG -> etag,
        VARY -> ACCEPT_ENCODING, CONTENT_ENCODING -> "gzip")
    } else {
      Ok(plainResponse).as(JSON).withHeaders(CACHE_CONTROL -> AvailabilityCacheControl, ETAG -> etag,
        VARY -> ACCEPT_ENCODING)
    }
  }
}

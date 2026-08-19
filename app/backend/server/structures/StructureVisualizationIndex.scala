/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.server.structures

import backend.server.structures.api._

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}
import java.util.Locale

import backend.server.database.Database
import play.api.libs.json.{JsValue, Json}

import scala.collection.JavaConverters._
import scala.util.Try

/** Maps a structure id to the contact map served for it.
  *
  * Two tiers, in order: a `structure_html_mapping.json` manifest at the root wins, and the on-disk
  * naming convention under `structure/` is the fallback. The manifest exists so a deployment can
  * point at files that do not follow the convention; nothing generates it today, so in practice
  * every lookup takes the second path.
  *
  * Every id that reaches here comes from a database cell — free text somebody typed — so the three
  * containment checks below are the boundary, not belt-and-braces. A resolved path that escapes the
  * root is dropped rather than served, `..` disqualifies a manifest entry outright, and the URL is
  * rebuilt from the relativized path rather than from the id.
  *
  * Takes a root rather than a `Database` so it can be exercised against a temporary directory.
  */
class StructureVisualizationIndex(root: Path) {

  private final val UrlPrefix = "/structure-files"

  private val htmlDirectory: Path = root.resolve("structure")
  private val manifest: Map[String, StructureVisualization] = loadManifest()

  /** Whether a contact map exists. Note this is a filesystem stat per unmapped id — `Structures`
    * calls it once per row while pruning, which is the single most expensive thing it does at boot. */
  def exists(structureId: String): Boolean = resolve(structureId).isDefined

  def resolve(structureId: String): Option[StructureVisualization] =
    Option(structureId).map(_.trim).filter(_.nonEmpty).flatMap { id =>
      val lowerId = id.toLowerCase(Locale.ROOT)
      manifest.get(lowerId).orElse(resolveByConvention(id, lowerId))
    }

  /** `<id>.html` beside an optional `<id>_simplified.html`. Both are tried under the id as written
    * and then lower-cased, so a file stored in one case is still found when the row carries the
    * other. */
  private def resolveByConvention(id: String, lowerId: String): Option[StructureVisualization] =
    locate(fileNames(id, lowerId, suffix = "")).flatMap(toUrl).map { standardUrl =>
      val simpleUrl = locate(fileNames(id, lowerId, suffix = "_simplified")).flatMap(toUrl)
      StructureVisualization(s"$UrlPrefix/$standardUrl", "html", simpleUrl.map(url => s"$UrlPrefix/$url"))
    }

  private def fileNames(id: String, lowerId: String, suffix: String): Seq[String] =
    Seq(id, lowerId).distinct.map(name => s"$name$suffix.html")

  /** Contained to `structure/`, not merely to the root.
    *
    * This used to check containment against the root, which `..` walks straight out of: an id of
    * `../secret` resolved to `<root>/secret.html`, still under the root, and was served. Nothing
    * exploits it today because every id reaching here has been through
    * `StructureIdentifiers.sanitize`, which splits on both slash directions and keeps the last
    * token — so `..` cannot survive. That is one sanitizer away from being a file-disclosure bug,
    * and the boundary belongs here as well.
    */
  private def locate(candidates: Seq[String]): Option[Path] =
    if (!Files.isDirectory(htmlDirectory)) None
    else candidates.iterator
      .map(htmlDirectory.resolve(_).normalize())
      .find(path => Files.isRegularFile(path) && path.startsWith(htmlDirectory))

  /** Path segments joined with `/` rather than the platform separator, so the URL is the same
    * wherever the application runs. */
  private def toUrl(file: Path): Option[String] = {
    val normalized = file.normalize()
    if (normalized.startsWith(root)) Some(root.relativize(normalized).iterator().asScala.mkString("/"))
    else None
  }

  private def loadManifest(): Map[String, StructureVisualization] = {
    val manifestPath = root.resolve("structure_html_mapping.json")
    if (!Files.isRegularFile(manifestPath)) {
      Map.empty
    } else {
      val parsed = Try(Json.parse(new String(Files.readAllBytes(manifestPath), StandardCharsets.UTF_8)))
        .toOption.getOrElse(Json.obj())

      (parsed \ "visualizations").asOpt[Seq[JsValue]].getOrElse(Seq.empty).flatMap(manifestEntry).toMap
    }
  }

  private def manifestEntry(entry: JsValue): Option[(String, StructureVisualization)] = {
    def relativePath(field: String): Option[String] =
      (entry \ field).asOpt[String].map(_.trim).filter(path => path.nonEmpty && !path.contains(".."))

    for {
      id <- (entry \ "structureId").asOpt[String].map(_.trim).filter(_.nonEmpty)
      standardUrl <- relativePath("relativePath").flatMap(manifestUrl)
    } yield {
      val kind = (entry \ "type").asOpt[String].map(_.trim).filter(_.nonEmpty).getOrElse("html")
      val simpleUrl = relativePath("relativePathSimple").flatMap(manifestUrl)
      id.toLowerCase(Locale.ROOT) ->
        StructureVisualization(s"$UrlPrefix/$standardUrl", kind, simpleUrl.map(url => s"$UrlPrefix/$url"))
    }
  }

  private def manifestUrl(relative: String): Option[String] = {
    val normalizedRelative = Paths.get(relative).normalize()
    val resolved = root.resolve(normalizedRelative).normalize()
    if (resolved.startsWith(root) && Files.isRegularFile(resolved)) {
      Some(normalizedRelative.iterator().asScala.mkString("/"))
    } else {
      None
    }
  }
}

object StructureVisualizationIndex {

  /** Where the `structure/` directory actually is.
    *
    * The database location, its parent, and a `test/merged` subdirectory, first one that has a
    * `structure/` child. The parent is in the list because a deployment may mount the database and
    * the structure files as siblings rather than nesting one inside the other. Falls back to the
    * database location, which yields an index that resolves nothing rather than an error — a
    * deployment missing its structure files degrades to an empty structure browser.
    */
  def resolveRoot(database: Database): Path = {
    val base = Paths.get(database.getLocation).toAbsolutePath.normalize()
    val candidates = Seq(
      base,
      Option(base.getParent).map(_.toAbsolutePath.normalize()).getOrElse(base),
      base.resolve("test").resolve("merged")
    ).map(_.normalize()).distinct

    candidates.find(hasStructureDirectory).getOrElse(base)
  }

  private def hasStructureDirectory(directory: Path): Boolean =
    Files.isDirectory(directory) && Files.isDirectory(directory.resolve("structure"))
}

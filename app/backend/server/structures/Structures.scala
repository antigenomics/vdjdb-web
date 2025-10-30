package backend.server.structures

import javax.inject.{Inject, Singleton}
import backend.server.database.Database
import backend.server.motifs.MotifsMetadata
import backend.server.motifs.api.filter.MotifsSearchTreeFilter
import backend.server.structures.api.cdr3.{StructureCDR3SearchEntry, StructureCDR3SearchResult, StructureCDR3SearchResultOptions}
import backend.server.structures.api.epitope.{StructureCluster, StructureClusterMeta, StructureEpitope, StructureVisualization}
import backend.server.structures.api.filter.StructuresSearchTreeFilterResult
import backend.utils.CommonUtils
import play.api.libs.json._
import tech.tablesaw.api.{ColumnType, StringColumn, Table}
import tech.tablesaw.io.csv.CsvReadOptions
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}
import java.util.Locale
import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.util.Try
import scala.io.Source

import scala.concurrent.{ExecutionContext, Future}

@Singleton
case class Structures @Inject()(database: Database)(implicit ec: ExecutionContext) {

  private val structureFilesRoot: Path = Structures.resolveImageRoot(database)
  private val standardHtmlDir: Path = structureFilesRoot.resolve("structure")
  private val visualizationMappings: Map[String, StructureVisualization] = loadVisualizationMappings()
  private val maxTopValueInCDR3Search: Int = 15

  private def loadVisualizationMappings(): Map[String, StructureVisualization] = {
    val indexPath = structureFilesRoot.resolve("structure_html_mapping.json")
    if (!Files.isRegularFile(indexPath)) {
      Map.empty
    } else {
      val content = Try(new String(Files.readAllBytes(indexPath), StandardCharsets.UTF_8)).getOrElse("")
      val parsed = Try(Json.parse(content)).toOption.getOrElse(Json.obj())
      (parsed \ "visualizations").asOpt[Seq[JsValue]].getOrElse(Seq.empty).flatMap { entry =>
        val idOpt = (entry \ "structureId").asOpt[String].map(_.trim).filter(_.nonEmpty)
        val relPathOpt = (entry \ "relativePath").asOpt[String].map(_.trim).filter(path => path.nonEmpty && !path.contains(".."))
        val kind = (entry \ "type").asOpt[String].map(_.trim).filter(_.nonEmpty).getOrElse("html")
        val simpleRelOpt = (entry \ "relativePathSimple").asOpt[String].map(_.trim).filter(path => path.nonEmpty && !path.contains(".."))

        def resolveToUrl(rel: String): Option[String] = {
          val normalizedRel = Paths.get(rel).normalize()
          val resolved = structureFilesRoot.resolve(normalizedRel).normalize()
          if (!resolved.startsWith(structureFilesRoot) || !Files.isRegularFile(resolved)) {
            None
          } else {
            Some(normalizedRel.iterator().asScala.mkString("/"))
          }
        }

        (idOpt, relPathOpt.flatMap(resolveToUrl)) match {
          case (Some(id), Some(relUrlPath)) =>
            val simpleUrl = simpleRelOpt.flatMap(resolveToUrl)
            Some(id.toLowerCase(Locale.ROOT) -> StructureVisualization(s"/structure-files/$relUrlPath", kind, simpleUrl.map(u => s"/structure-files/$u")))
          case _ =>
            None
        }
      }.toMap
    }
  }

  // ---------- load vdjdb.txt ----------
  private def loadVdjdb(): Table = {
    val path = database.getLocation + "/vdjdb.txt"
    val headerColumns: Array[String] = {
      val source = Source.fromFile(path, StandardCharsets.UTF_8.name())
      try {
        source.getLines().take(1).flatMap { line =>
          if (line == null || line.trim.isEmpty) {
            None
          } else {
            Some(line.split("\t", -1))
          }
        }.toSeq.headOption.getOrElse(Array.empty[String])
      } finally {
        source.close()
      }
    }

    val defaultColumnTypes: Array[ColumnType] = Array(
      ColumnType.SKIP,   // complex.id
      ColumnType.STRING, // gene
      ColumnType.STRING, // cdr3
      ColumnType.STRING, // v.segm
      ColumnType.STRING, // j.segm
      ColumnType.STRING, // species
      ColumnType.STRING, // mhc.a
      ColumnType.STRING, // mhc.b
      ColumnType.STRING, // mhc.class
      ColumnType.STRING, // antigen.epitope
      ColumnType.STRING, // antigen.gene
      ColumnType.STRING, // antigen.species
      ColumnType.SKIP,   // reference.id
      ColumnType.SKIP,   // method
      ColumnType.STRING, // meta
      ColumnType.SKIP,   // cdr3fix
      ColumnType.SKIP,   // vdjdb.score
      ColumnType.SKIP,   // web.method
      ColumnType.SKIP,   // web.method.seq
      ColumnType.SKIP,   // web.cdr3fix.nc
      ColumnType.SKIP    // web.cdr3fix.unmp
    )

    val columnTypes: Array[ColumnType] =
      if (headerColumns.nonEmpty) {
        headerColumns.map {
          case "complex.id"        => ColumnType.SKIP
          case "gene"              => ColumnType.STRING
          case "cdr3"              => ColumnType.STRING
          case "v.segm"            => ColumnType.STRING
          case "j.segm"            => ColumnType.STRING
          case "species"           => ColumnType.STRING
          case "mhc.a"             => ColumnType.STRING
          case "mhc.b"             => ColumnType.STRING
          case "mhc.class"         => ColumnType.STRING
          case "antigen.epitope"   => ColumnType.STRING
          case "antigen.gene"      => ColumnType.STRING
          case "antigen.species"   => ColumnType.STRING
          case "reference.id"      => ColumnType.SKIP
          case "method"            => ColumnType.SKIP
          case "meta"              => ColumnType.STRING
          case "contacts"          => ColumnType.STRING
          case "cdr3fix"           => ColumnType.SKIP
          case "vdjdb.score"       => ColumnType.SKIP
          case "web.method"        => ColumnType.SKIP
          case "web.method.seq"    => ColumnType.SKIP
          case "web.cdr3fix.nc"    => ColumnType.SKIP
          case "web.cdr3fix.unmp"  => ColumnType.SKIP
          case other               => ColumnType.STRING
        }
      } else {
        defaultColumnTypes
      }

    val optsBuilder = CsvReadOptions
      .builder(path)
      .separator('\t')
      .header(true)
      .sample(false)

    val opts = optsBuilder.columnTypes(columnTypes).build() // TSV with header
    val table = Table.read().csv(opts)

    if (table.columnNames().contains("mhc.a")) {
      val trimmed = table.stringColumn("mhc.a").replaceAll(":.+", "").setName("mhc.a")
      table.replaceColumn("mhc.a", trimmed)
    }
    if (table.columnNames().contains("mhc.b")) {
      val trimmed = table.stringColumn("mhc.b").replaceAll(":.+", "").setName("mhc.b")
      table.replaceColumn("mhc.b", trimmed)
    }

    table  // tech.tablesaw read using options
  }

  private val raw: Table = loadVdjdb()

  // ---------- derive columns from JSON in "meta" ----------
  private def getMetaCol(t: Table): StringColumn =
    if (t.columnNames().contains("meta")) t.stringColumn("meta")
    else StringColumn.create("meta") // empty fallback

  private def getTcrHashCol(t: Table): Option[StringColumn] =
    if (t.columnNames().contains("TCR_hash")) Some(t.stringColumn("TCR_hash"))
    else None

  private val structureIdJsonKeys: Seq[String] = Seq(
    "structure.id",
    "structureId",
    "structure",
    "structure_id",
    "structureHash",
    "structure.hash",
    "TCR_hash"
  )

  private val structureIdTokenPattern = "^[A-Za-z0-9_-]{4,}$".r

  private def sanitizeStructureIdCandidate(candidate: String): Option[String] = {
    if (candidate == null) {
      None
    } else {
      val trimmed = candidate.trim
      if (trimmed.isEmpty) {
        None
      } else {
        val withoutExt = if (trimmed.toLowerCase(Locale.ROOT).endsWith(".html")) {
          trimmed.dropRight(5)
        } else {
          trimmed
        }
        val normalizedSeparators = withoutExt.replace('\\', '/')
        val roughTokens = normalizedSeparators
          .split("[\\s,;|]+")
          .flatMap(_.split(":"))
          .flatMap(_.split("/"))
          .map(_.trim)
          .filter(_.nonEmpty)
        roughTokens.reverseIterator.collectFirst {
          case token if structureIdTokenPattern.pattern.matcher(token).matches() => token
        }
      }
    }
  }

  private def extractStructureIdFromJsValue(jsValue: JsValue): Option[String] =
    jsValue match {
      case JsString(value) => sanitizeStructureIdCandidate(value)
      case JsArray(values) =>
        values.iterator
          .map(extractStructureIdFromJsValue)
          .collectFirst { case Some(id) => id }
      case JsObject(fields) =>
        structureIdJsonKeys.iterator
          .flatMap(fields.get)
          .map(extractStructureIdFromJsValue)
          .collectFirst { case Some(id) => id }
      case _ => None
    }

  private def extractStructureId(metaStr: String, hashStr: Option[String]): Option[String] = {
    val fromHash = hashStr.flatMap(sanitizeStructureIdCandidate).map(_.trim).filter(_.nonEmpty)
    val fromMeta = Option(metaStr)
      .map(meta => pickFromJson(meta, structureIdJsonKeys))
      .map(_.trim)
      .filter(_.nonEmpty)
    fromHash.orElse(fromMeta)
  }

  private def buildStructureIdColumn(t: Table): StringColumn = {
    val metaCol = getMetaCol(t)
    val hashColOpt = getTcrHashCol(t)
    val values = new java.util.ArrayList[String](t.rowCount())
    var i = 0
    while (i < t.rowCount()) {
      val metaRaw = Try(metaCol.get(i)).getOrElse("")
      val hashRaw = hashColOpt.flatMap(col => Option(col.get(i)))
      val resolved = extractStructureId(metaRaw, hashRaw).getOrElse("")
      values.add(resolved)
      i += 1
    }
    StringColumn.create("structure.id", values)
  }

  private def pickFromJson(metaStr: String, keys: Seq[String]): String = {
    if (metaStr == null || metaStr.isEmpty) return ""
    val js = scala.util.Try(Json.parse(metaStr)).toOption.getOrElse(JsNull)

    // Try flat keys like "structure.id" first, then nested "structure" -> "id"
    def lookup(jsv: JsValue, key: String): Option[String] = {
      val flat = (jsv \ key).asOpt[String]
      if (flat.isDefined) flat
      else if (key.contains(".")) {
        val parts = key.split("\\.").toList
        parts match {
          case h :: tail => tail.foldLeft(jsv \ h: JsLookupResult)((acc, k) => acc \ k).toOption.flatMap(_.asOpt[String])
          case _ => None
        }
      } else None
    }

    keys.view.flatMap(k => lookup(js, k)).map(_.trim).find(_.nonEmpty).getOrElse("")
  }

  private def deriveColFromMeta(t: Table, newName: String, keys: Seq[String]): StringColumn = {
    val meta = getMetaCol(t)
    val values = new java.util.ArrayList[String](t.rowCount())
    var i = 0
    while (i < t.rowCount()) {
      val v = pickFromJson(meta.get(i), keys)
      values.add(v)
      i += 1
    }
    StringColumn.create(newName, values)
  }

  private val withDerived: Table = {
    val t = raw.copy()
    // derive "structure.id" (TCR hash preferred) and "cell.subset" from JSON
    val structureIdCol = buildStructureIdColumn(t)
    val cellSubsetCol  = deriveColFromMeta(t, "cell.subset",
      Seq("cell.subset", "cellSubset", "cell_subset", "cell.subset"))

    t.addColumns(structureIdCol)
    t.addColumns(cellSubsetCol)
    t
  }

  // ---------- keep only rows that actually have a structure visualization ----------
  private val structures: Table = {
    val sid = withDerived.stringColumn("structure.id")
    // prune empty / missing / literal "null"
    val nonEmpty = sid.isNotMissing.and(sid.isNotEqualTo("")).and(sid.isNotEqualTo("null"))
    val filteredNonEmpty = withDerived.where(nonEmpty)

    val idCol = filteredNonEmpty.stringColumn("structure.id")
    val kept = mutable.ArrayBuffer.empty[Int]

    var idx = 0
    while (idx < filteredNonEmpty.rowCount()) {
      val rawId = Option(idCol.get(idx)).map(_.trim).getOrElse("")
      if (hasStructureVisualization(rawId)) {
        kept += idx
      }
      idx += 1
    }

    if (kept.isEmpty) {
      filteredNonEmpty.emptyCopy()
    } else {
      val selection = tech.tablesaw.selection.Selection.`with`(kept.toArray: _*)
      filteredNonEmpty.where(selection)
    }
  }

  // ---------- metadata tree built from pruned table ----------
  private val metadataLevels = Seq("species", "gene", "mhc.class", "mhc.a", "antigen.epitope")
  private val metadata: MotifsMetadata =
    MotifsMetadata.generateMetadataFromLevels(structures, metadataLevels)

  private val structureIdIndex: Map[String, String] = {
    val idCol = structures.stringColumn("structure.id")
    val acc = mutable.LinkedHashMap.empty[String, String]
    var idx = 0
    while (idx < structures.rowCount()) {
      val rawIdOpt = Option(idCol.get(idx)).map(_.trim).filter(_.nonEmpty)
      rawIdOpt.foreach { rawId =>
        val normalized = rawId.toLowerCase(Locale.ROOT)
        if (!acc.contains(normalized)) {
          acc.update(normalized, rawId)
        }
      }
      idx += 1
    }
    acc.toMap
  }

  private val availableStructureIds: Set[String] = structureIdIndex.keySet

  def getMetadata: MotifsMetadata = metadata

  def getAvailableStructureIds: Set[String] = availableStructureIds

  def getHtmlVisualizations: Map[String, StructureVisualization] = {
    structureIdIndex.flatMap { case (normalized, rawId) =>
      resolveVisualization(rawId).filter(_.kind.equalsIgnoreCase("html")).map(normalized -> _)
    }
  }

  // ---------- filter → flat list of structures ----------
  def filter(f: MotifsSearchTreeFilter): Future[StructuresSearchTreeFilterResult] = Future {
    val selOpt = f.entries
      .map(h => structures.stringColumn(h.name).isEqualTo(h.value))
      .reduceRightOption((l, r) => l.and(r))

    val filtered = selOpt.map(structures.where).getOrElse(structures)

    val epitopeGroups = filtered.splitOn(filtered.stringColumn("antigen.epitope")).asTableList().asScala

    val epitopes: Seq[StructureEpitope] = epitopeGroups.flatMap { epitopeTable =>
      val epitopeValue = firstNonEmpty(epitopeTable, "antigen.epitope")
      epitopeValue.map { epitopeName =>
        val hashSeed = metadataLevels.flatMap(level => firstValue(epitopeTable, level)).mkString
        val hash = if (hashSeed.nonEmpty) CommonUtils.md5(hashSeed) else s"structures:$epitopeName"

        val clusters: Seq[StructureCluster] = epitopeTable
          .splitOn(epitopeTable.stringColumn("structure.id"))
          .asTableList()
          .asScala
          .flatMap(buildCluster)
          .toSeq

        if (clusters.nonEmpty) Some(StructureEpitope(epitopeName, hash, clusters)) else None
      }
    }.flatten

    StructuresSearchTreeFilterResult(epitopes)
  }

  def cdr3(cdr3: String, substring: Boolean, gene: String, top: Int): Future[StructureCDR3SearchResult] = Future {
    val query = Option(cdr3).map(_.trim).getOrElse("")
    val normalizedGene = Option(gene).map(_.trim.toUpperCase(Locale.ROOT)).getOrElse("BOTH")
    val safeTop = Math.max(1, Math.min(maxTopValueInCDR3Search, if (top <= 0) maxTopValueInCDR3Search else top))

    if (query.isEmpty) {
      StructureCDR3SearchResult(
        StructureCDR3SearchResultOptions(query, safeTop, normalizedGene, substring),
        Seq.empty,
        Seq.empty
      )
    } else {
      val base = filterByGene(structures, normalizedGene)
      if (!base.columnNames().contains("cdr3")) {
        StructureCDR3SearchResult(
          StructureCDR3SearchResultOptions(query, safeTop, normalizedGene, substring),
          Seq.empty,
          Seq.empty
        )
      } else {
        val matchesByStructure = mutable.HashMap.empty[String, Int]
        val cdr3Col = base.stringColumn("cdr3")
        val structureCol = base.stringColumn("structure.id")
        val queryUpper = query.toUpperCase(Locale.ROOT)

        var idx = 0
        while (idx < base.rowCount()) {
          val rawStructureId = Option(structureCol.get(idx)).map(_.trim).getOrElse("")
          if (rawStructureId.nonEmpty) {
            val cVal = Option(cdr3Col.get(idx)).map(_.trim).getOrElse("")
            val matchesCdr3 = if (substring) cVal.toUpperCase(Locale.ROOT).contains(queryUpper) else cVal.equalsIgnoreCase(query)
            if (matchesCdr3) {
              matchesByStructure.update(rawStructureId, matchesByStructure.getOrElse(rawStructureId, 0) + 1)
            }
          }
          idx += 1
        }

        val candidateEntries = mutable.ArrayBuffer.empty[(StructureCluster, Double, Double)]

        matchesByStructure.foreach { case (structureId, count) =>
          val table = structures.where(structures.stringColumn("structure.id").isEqualTo(structureId))
          buildCluster(table).foreach { cluster =>
            val normalizedScore = if (cluster.size <= 0) count.toDouble else count.toDouble / cluster.size
            candidateEntries += ((cluster, count.toDouble, normalizedScore))
          }
        }

        val clusters = takeDistinct(candidateEntries.sortBy(-_._2).toVector, safeTop)
          .map { case (cluster, score, _) => StructureCDR3SearchEntry(score, query, cluster) }
        val clustersNorm = takeDistinct(candidateEntries.sortBy(-_._3).toVector, safeTop)
          .map { case (cluster, _, scoreNorm) => StructureCDR3SearchEntry(scoreNorm, query, cluster) }

        StructureCDR3SearchResult(
          StructureCDR3SearchResultOptions(query, safeTop, normalizedGene, substring),
          clusters,
          clustersNorm
        )
      }
    }
  }

  private def firstValue(table: Table, column: String): Option[String] = {
    if (!table.columnNames().contains(column)) {
      None
    } else {
      table.stringColumn(column).asList().asScala.collect {
        case value if value != null && value.trim.nonEmpty => value.trim
      }.headOption
    }
  }

  private def firstNonEmpty(table: Table, column: String): Option[String] = firstValue(table, column)

  private def buildCluster(table: Table): Option[StructureCluster] = {
    val structureId = firstValue(table, "structure.id").getOrElse("")
    if (structureId.isEmpty) {
      None
    } else {
      val size = table.rowCount()
      val length = firstValue(table, "cdr3").map(_.length).getOrElse(0)
      val vsegm = firstValue(table, "v.segm").getOrElse("")
      val jsegm = firstValue(table, "j.segm").getOrElse("")
      val cellSubsetValue = firstValue(table, "cell.subset").getOrElse("")

      val trimmedId = structureId.trim
      val visualizationOpt = resolveVisualization(trimmedId)
      if (visualizationOpt.isEmpty) {
        return None
      }

      val meta = StructureClusterMeta(
        species = firstValue(table, "species").getOrElse(""),
        gene = firstValue(table, "gene").getOrElse(""),
        mhcclass = firstValue(table, "mhc.class").getOrElse(""),
        mhca = firstValue(table, "mhc.a").getOrElse(""),
        mhcb = firstValue(table, "mhc.b").getOrElse(""),
        antigenGene = firstValue(table, "antigen.gene").getOrElse(""),
        antigenSpecies = firstValue(table, "antigen.species").getOrElse(""),
        cellSubset = cellSubsetValue
      )

      Some(StructureCluster(trimmedId, size, length, vsegm, jsegm, Seq.empty, meta, visualizationOpt))
    }
  }

  private def hasStructureVisualization(structureId: String): Boolean =
    resolveVisualization(structureId).isDefined

  private def resolveVisualization(structureId: String): Option[StructureVisualization] = {
    val trimmedId = Option(structureId).map(_.trim).getOrElse("")
    if (trimmedId.isEmpty) {
      None
    } else {
      val lowerId = trimmedId.toLowerCase(Locale.ROOT)
      visualizationMappings.get(lowerId).orElse {
        locateStandardHtml(trimmedId, lowerId).flatMap { stdPath =>
          toUrlPath(stdPath).map { standardUrlPath =>
            val simplePath = locateSimpleHtml(trimmedId, lowerId).flatMap(toUrlPath)
            StructureVisualization(s"/structure-files/$standardUrlPath", "html", simplePath.map(url => s"/structure-files/$url"))
          }
        }
      }
    }
  }

  private def locateStandardHtml(originalId: String, lowerId: String): Option[Path] = {
    val candidates = Seq(
      s"$originalId.html",
      if (lowerId != originalId) s"$lowerId.html" else ""
    ).filter(_.nonEmpty)
    locateInStructureDirectory(candidates)
  }

  private def locateSimpleHtml(originalId: String, lowerId: String): Option[Path] = {
    val candidates = Seq(
      s"${originalId}_simplified.html",
      if (lowerId != originalId) s"${lowerId}_simplified.html" else ""
    ).filter(_.nonEmpty)
    locateInStructureDirectory(candidates)
  }

  private def locateInStructureDirectory(candidateFileNames: Seq[String]): Option[Path] = {
    if (!Files.isDirectory(standardHtmlDir)) {
      None
    } else {
      candidateFileNames.iterator.flatMap { name =>
        val normalized = standardHtmlDir.resolve(name).normalize()
        if (Files.isRegularFile(normalized) && normalized.startsWith(structureFilesRoot)) Some(normalized) else None
      }.collectFirst { case path => path }
    }
  }

  private def toUrlPath(file: Path): Option[String] = {
    val normalized = file.normalize()
    if (!normalized.startsWith(structureFilesRoot)) {
      None
    } else {
      Some(structureFilesRoot.relativize(normalized).iterator().asScala.mkString("/"))
    }
  }

  private def filterByGene(table: Table, gene: String): Table = {
    gene match {
      case "TRA" | "TRB" =>
        if (table.columnNames().contains("gene")) {
          table.where(table.stringColumn("gene").isEqualTo(gene))
        } else {
          table
        }
      case _ => table
    }
  }

  private def takeDistinct(entries: Vector[(StructureCluster, Double, Double)], limit: Int): Seq[(StructureCluster, Double, Double)] = {
    if (limit <= 0) {
      Seq.empty
    } else {
      val seen = mutable.HashSet.empty[String]
      val buffer = mutable.ArrayBuffer.empty[(StructureCluster, Double, Double)]
      var idx = 0
      val upper = if (limit > entries.length) entries.length else limit
      while (idx < entries.length && buffer.length < upper) {
        val entry = entries(idx)
        val id = entry._1.clusterId
        if (!seen.contains(id)) {
          seen += id
          buffer += entry
        }
        idx += 1
      }
      buffer
    }
  }
}

object Structures {
  private def hasStructureDirectories(dir: Path): Boolean =
    Files.isDirectory(dir) && Files.isDirectory(dir.resolve("structure"))

  def resolveImageRoot(database: Database): Path = {
    val base = Paths.get(database.getLocation).toAbsolutePath.normalize()
    val candidates = Seq(
      base,
      base.getParent match {
        case null => base
        case parent => parent.toAbsolutePath.normalize()
      },
      base.resolve("test").resolve("merged")
    ).map(_.normalize()).distinct

    candidates.find(hasStructureDirectories).getOrElse(base)
  }
}

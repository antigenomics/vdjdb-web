package backend.server.structures

import backend.server.structures.api._

import javax.inject.{Inject, Singleton}
import backend.server.database.Database
import backend.server.motifs.MotifsMetadata
import backend.server.motifs.api.filter.MotifsSearchTreeFilter
import backend.utils.CommonUtils
import play.api.libs.json._
import tech.tablesaw.api.{StringColumn, Table}
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

  private val visualizations = new StructureVisualizationIndex(StructureVisualizationIndex.resolveRoot(database))
  private lazy val motifClusterIdIndex: Map[String, String] = loadMotifClusterIdIndex(buildStructureKeySet())
  // Per-model confidence metrics, keyed by lower-cased structure hash (see
  // tools/build_structures_metadata.py). Empty map if the companion file is absent.
  private val structureMetricsIndex: Map[String, StructureModelMetrics] =
    StructureMetricsIndex.load(Paths.get(database.getLocation))

  private case class ChainInfo(cdr3: String, vsegm: String, jsegm: String, motifClusterId: Option[String])

  private def firstValueForGene(table: Table, gene: String, column: String): Option[String] = {
    if (!table.columnNames().contains("gene") || !table.columnNames().contains(column)) {
      None
    } else {
      val filtered = table.where(table.stringColumn("gene").isEqualTo(gene))
      if (filtered.rowCount() == 0) None else firstValue(filtered, column)
    }
  }

  private def loadMotifClusterIdIndex(allowedKeys: Set[String]): Map[String, String] = {
    if (allowedKeys.isEmpty) {
      return Map.empty
    }
    database.getClusterMembersFile match {
      case Some(file) if file.exists() =>
        val source = Source.fromFile(file, StandardCharsets.UTF_8.name())
        try {
          val iter = source.getLines()
          if (!iter.hasNext) {
            Map.empty
          } else {
            val header = iter.next().split("\t", -1)
            val index = header.zipWithIndex.toMap
            val required = Seq("species", "gene", "antigen.epitope", "cdr3aa", "v.segm", "j.segm", "cid")
            if (!required.forall(index.contains)) {
              Map.empty
            } else {
              val builder = mutable.HashMap.empty[String, String]
              iter.foreach { line =>
                val cols = line.split("\t", -1)
                if (cols.length > index("cid")) {
                  val key = StructureIdentifiers.motifClusterKey(
                    cols(index("species")),
                    cols(index("gene")),
                    cols(index("antigen.epitope")),
                    cols(index("cdr3aa")),
                    cols(index("v.segm")),
                    cols(index("j.segm"))
                  )
                  val cid = cols(index("cid")).trim
                  if (key.nonEmpty && cid.nonEmpty && allowedKeys.contains(key) && !builder.contains(key)) {
                    builder.update(key, cid)
                  }
                }
              }
              builder.toMap
            }
          }
        } finally {
          source.close()
        }
      case _ =>
        Map.empty
    }
  }

  private def buildStructureKeySet(): Set[String] = {
    val required = Seq("species", "gene", "antigen.epitope", "cdr3", "v.segm", "j.segm")
    if (!required.forall(structures.columnNames().contains)) {
      Set.empty
    } else {
      val speciesCol = structures.stringColumn("species")
      val geneCol = structures.stringColumn("gene")
      val epitopeCol = structures.stringColumn("antigen.epitope")
      val cdr3Col = structures.stringColumn("cdr3")
      val vsegmCol = structures.stringColumn("v.segm")
      val jsegmCol = structures.stringColumn("j.segm")
      val builder = mutable.HashSet.empty[String]
      var idx = 0
      while (idx < structures.rowCount()) {
        val key = StructureIdentifiers.motifClusterKey(
          speciesCol.get(idx),
          geneCol.get(idx),
          epitopeCol.get(idx),
          cdr3Col.get(idx),
          vsegmCol.get(idx),
          jsegmCol.get(idx)
        )
        if (key.nonEmpty) {
          builder += key
        }
        idx += 1
      }
      builder.toSet
    }
  }

  private def lookupMotifClusterId(species: String, gene: String, epitope: String, cdr3: String, vsegm: String, jsegm: String): Option[String] = {
    val key = StructureIdentifiers.motifClusterKey(species, gene, epitope, cdr3, vsegm, jsegm)
    if (key.isEmpty) None else motifClusterIdIndex.get(key)
  }

  private def buildChainLabel(vsegm: String, cdr3: String, jsegm: String): String = {
    val parts = Seq(vsegm, cdr3, jsegm).map(_.trim).filter(_.nonEmpty)
    if (parts.isEmpty) "" else parts.mkString("-")
  }

  // ---------- load vdjdb.txt ----------

  private val raw: Table = StructureTableLoader.load(database.getLocation + "/vdjdb.txt")

  // ---------- derive columns from JSON in "meta" ----------

  private val withDerived: Table = {
    val t = raw.copy()
    // derive "structure.id" (TCR hash preferred) and "cell.subset" from JSON
    t.addColumns(StructureMetaColumns.structureIdColumn(t))
    t.addColumns(StructureMetaColumns.derivedColumn(t, "cell.subset", StructureMetaColumns.CellSubsetKeys))
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
      if (visualizations.exists(rawId)) {
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
  private val metadataLevels = Seq("mhc.class", "mhc.pair", "antigen.epitope")
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

  // Metrics only for structures that actually have a visualization, keyed by lower-cased hash.
  def getStructureMetrics: Map[String, StructureModelMetrics] =
    availableStructureIds.iterator.flatMap(id => structureMetricsIndex.get(id).map(id -> _)).toMap

  def getHtmlVisualizations: Map[String, StructureVisualization] = {
    structureIdIndex.flatMap { case (normalized, rawId) =>
      visualizations.resolve(rawId).filter(_.kind.equalsIgnoreCase("html")).map(normalized -> _)
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
      val epitopeValue = firstValue(epitopeTable, "antigen.epitope")
      epitopeValue.map { epitopeName =>
        val hashSeed = metadataLevels.flatMap(level => firstValue(epitopeTable, level)).mkString
        val hash = if (hashSeed.nonEmpty) CommonUtils.md5(hashSeed) else s"structures:$epitopeName"

        val clusters: Seq[StructureCluster] = epitopeTable
          .splitOn(epitopeTable.stringColumn("structure.id"))
          .asTableList()
          .asScala
          .flatMap(buildCluster)
          .sortBy(c => (-c.size, c.clusterId))
          .toSeq

        if (clusters.nonEmpty) Some(StructureEpitope(epitopeName, hash, clusters)) else None
      }
    }.flatten

    StructuresSearchTreeFilterResult(epitopes)
  }
  def cdr3(cdr3: String, substring: Boolean, gene: String, top: Int): Future[StructureCdr3SearchResult] = Future {
    val query = Option(cdr3).map(_.trim).getOrElse("")
    val chain = StructureCdr3Search.normalizeGene(gene)
    val limit = StructureCdr3Search.resultLimit(top)
    val options = StructureCdr3SearchResultOptions(query, limit, chain, substring)

    val tallies = StructureCdr3Search.tally(StructureCdr3Search.filterByGene(structures, chain), query, substring)

    val candidates = tallies.toSeq.flatMap { case (structureId, stats) =>
      buildCluster(structures.where(structures.stringColumn("structure.id").isEqualTo(structureId))).map { cluster =>
        val matches = stats.matches.toDouble
        StructureCdr3Search.Candidate(
          cluster = cluster,
          score = matches,
          // The cluster is built from the whole table while the matches were counted on the
          // gene-filtered one, so a single-chain query scores roughly half what BOTH would.
          normalizedScore = if (cluster.size <= 0) matches else matches / cluster.size,
          pattern = StructureIdentifiers.preferredPattern(stats.patternCounts, query.toUpperCase(Locale.ROOT)),
          // Naming a chain is only meaningful when more than one was searched.
          chain = if (chain == StructureCdr3Search.BothChains) StructureIdentifiers.chainLabels(stats.chainLabels) else None)
      }
    }

    val (byCount, byShare) = StructureCdr3Search.rank(candidates, limit)
    StructureCdr3SearchResult(options, byCount, byShare)
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

  private def extractBoundsFromCdr3Fix(raw: String): (Int, Int) = {
    val parsed = Option(raw).map(_.trim).filter(_.nonEmpty).flatMap((value) => Try(Json.parse(value)).toOption)
    parsed match {
      case Some(js) =>
        val vEnd = (js \ "vEnd").asOpt[Int].orElse((js \ "vEnd").asOpt[Double].map(_.toInt)).getOrElse(-1)
        val jStart = (js \ "jStart").asOpt[Int].orElse((js \ "jStart").asOpt[Double].map(_.toInt)).getOrElse(-1)
        (vEnd, jStart)
      case None =>
        (-1, -1)
    }
  }

  private def firstCdr3BoundsForGene(table: Table, gene: String): (Int, Int) = {
    if (!table.columnNames().contains("gene") || !table.columnNames().contains("cdr3fix")) {
      (-1, -1)
    } else {
      val filtered = table.where(table.stringColumn("gene").isEqualTo(gene))
      if (filtered.rowCount() == 0) {
        (-1, -1)
      } else {
        val raw = Option(filtered.stringColumn("cdr3fix").get(0)).getOrElse("")
        extractBoundsFromCdr3Fix(raw)
      }
    }
  }

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
      val speciesValue = firstValue(table, "species").getOrElse("")
      val epitopeValue = firstValue(table, "antigen.epitope").getOrElse("")

      def buildChainInfo(gene: String): Option[ChainInfo] = {
        val cdr3 = firstValueForGene(table, gene, "cdr3").getOrElse("")
        val v = firstValueForGene(table, gene, "v.segm").getOrElse("")
        val j = firstValueForGene(table, gene, "j.segm").getOrElse("")
        if (cdr3.isEmpty && v.isEmpty && j.isEmpty) {
          None
        } else {
          val motifId = lookupMotifClusterId(speciesValue, gene, epitopeValue, cdr3, v, j)
          Some(ChainInfo(cdr3, v, j, motifId))
        }
      }

      val alphaInfo = buildChainInfo("TRA")
      val betaInfo = buildChainInfo("TRB")
      val (cdr3aVEnd, cdr3aJStart) = firstCdr3BoundsForGene(table, "TRA")
      val (cdr3bVEnd, cdr3bJStart) = firstCdr3BoundsForGene(table, "TRB")

      val displayIds = Seq(alphaInfo.flatMap(_.motifClusterId), betaInfo.flatMap(_.motifClusterId)).flatten.distinct
      val displayId = displayIds match {
        case Seq() => ""
        case Seq(single) => single
        case many => many.mkString(" / ")
      }

      val alphaLabel = alphaInfo.map(info => buildChainLabel(info.vsegm, info.cdr3, info.jsegm)).getOrElse("")
      val betaLabel = betaInfo.map(info => buildChainLabel(info.vsegm, info.cdr3, info.jsegm)).getOrElse("")
      val tcrPairLabel = Seq(alphaLabel, betaLabel).filter(_.nonEmpty).mkString("; ")

      val trimmedId = structureId.trim
      val visualizationOpt = visualizations.resolve(trimmedId)
      if (visualizationOpt.isEmpty) {
        return None
      }

      val geneValues = if (table.columnNames().contains("gene")) {
        table.stringColumn("gene").asSet().asScala.map(_.trim).filter(_.nonEmpty).toSeq
      } else {
        Seq.empty
      }
      val geneValue = {
        val normalized = geneValues.map(_.toUpperCase(Locale.ROOT)).toSet
        if (normalized.contains("TRA") && normalized.contains("TRB")) "TRA/TRB"
        else geneValues.headOption.getOrElse("")
      }

      val meta = StructureClusterMeta(
        species = speciesValue,
        gene = geneValue,
        mhcclass = firstValue(table, "mhc.class").getOrElse(""),
        mhca = firstValue(table, "mhc.a").getOrElse(""),
        mhcb = firstValue(table, "mhc.b").getOrElse(""),
        antigenGene = firstValue(table, "antigen.gene").getOrElse(""),
        antigenSpecies = firstValue(table, "antigen.species").getOrElse(""),
        cellSubset = cellSubsetValue
      )

      val metricsOpt = structureMetricsIndex.get(trimmedId.toLowerCase(Locale.ROOT))

      Some(StructureCluster(trimmedId, displayId, tcrPairLabel, size, length, vsegm, jsegm, meta, visualizationOpt,
        cdr3aVEnd, cdr3aJStart, cdr3bVEnd, cdr3bJStart, metricsOpt))
    }
  }

}


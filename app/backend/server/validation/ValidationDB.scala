package backend.server.validation

import javax.inject.Singleton
import play.api.Logger

import scala.io.Source
import scala.util.Try

case class ValidationEntry(positive: Boolean, negative: Boolean)

@Singleton
class ValidationDB {
  private val logger = Logger(getClass)

  // key: "cdr3_lower|epitope_lower"
  val lookupIndex: Map[String, ValidationEntry] = loadIndex()

  private def loadIndex(): Map[String, ValidationEntry] = {
    val dir = new java.io.File("validation-db")
    if (!dir.exists || !dir.isDirectory) {
      logger.info("validation-db directory not found; validation lookup will be empty")
      return Map.empty
    }

    val csvFiles = Option(dir.listFiles()).getOrElse(Array.empty)
      .filter(f => f.isFile && f.getName.endsWith(".csv"))

    if (csvFiles.isEmpty) {
      logger.info("No CSV files in validation-db; validation lookup will be empty")
      return Map.empty
    }

    val accumulated = scala.collection.mutable.Map[String, ValidationEntry]()

    csvFiles.foreach { f =>
      logger.info(s"Loading validation data from ${f.getName}")
      Try {
        val source = Source.fromFile(f, "UTF-8")
        try {
          val lines = source.getLines().toList
          if (lines.nonEmpty) {
            val header = lines.head.split(",").map(_.trim)
            val alphaIdx   = header.indexOf("cdr3_alpha_aa")
            val betaIdx    = header.indexOf("cdr3_beta_aa")
            val epitopeIdx = header.indexOf("epitope_aa")
            val log2Idx    = header.indexOf("log2FoldChange")
            val padjIdx    = header.indexOf("padj")

            if (Seq(alphaIdx, betaIdx, epitopeIdx, log2Idx, padjIdx).forall(_ >= 0)) {
              lines.tail.foreach { line =>
                val fields = line.split(",", -1)
                if (fields.length > padjIdx) {
                  val alpha   = fields(alphaIdx).trim
                  val beta    = fields(betaIdx).trim
                  val epitope = fields(epitopeIdx).trim.toLowerCase
                  val log2FC  = Try(fields(log2Idx).trim.toDouble).toOption
                  val padj    = Try(fields(padjIdx).trim.toDouble).toOption

                  for {
                    fc   <- log2FC
                    pval <- padj
                    if !fc.isNaN && !pval.isNaN && pval < 0.05
                    if epitope.nonEmpty
                  } {
                    val isPos = fc > 0
                    val isNeg = fc < 0

                    def merge(cdr3: String): Unit = {
                      val key  = cdr3.toLowerCase + "|" + epitope
                      val prev = accumulated.getOrElse(key, ValidationEntry(positive = false, negative = false))
                      accumulated(key) = ValidationEntry(prev.positive || isPos, prev.negative || isNeg)
                    }

                    if (beta.nonEmpty)  merge(beta)
                    if (alpha.nonEmpty) merge(alpha)
                  }
                }
              }
            } else {
              logger.warn(s"Validation CSV ${f.getName} is missing required columns, skipping")
            }
          }
        } finally {
          source.close()
        }
      }.recover { case e => logger.error(s"Error reading ${f.getName}: ${e.getMessage}") }
    }

    logger.info(s"Validation index loaded: ${accumulated.size} entries")
    accumulated.toMap
  }

  def getValidationKeys(): Set[String] = lookupIndex.keySet

  def getStatusIndex(): Map[String, String] = lookupIndex.map { case (key, entry) =>
    key -> ((entry.positive, entry.negative) match {
      case (true, true)  => "both"
      case (true, false) => "positive"
      case _             => "negative"
    })
  }
}

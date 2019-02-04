package backend.server.motifs.api.cdr3

import play.api.libs.json.{Format, Json}

case class MotifCDR3SearchResultOptions(cdr3: String, top: Int, gene: String, substring: Boolean)

object MotifCDR3SearchResultOptions {
  implicit val motifCDR3SearchResultOptionsFormat: Format[MotifCDR3SearchResultOptions] = Json.format[MotifCDR3SearchResultOptions]
}

package backend.server.structures.api.cdr3

import play.api.libs.json.{Format, Json}

case class StructureCDR3SearchResultOptions(cdr3: String, top: Int, gene: String, substring: Boolean)

object StructureCDR3SearchResultOptions {
  implicit val structureCDR3SearchResultOptionsFormat: Format[StructureCDR3SearchResultOptions] = Json.format[StructureCDR3SearchResultOptions]
}

package backend.server.filters

object FilterType extends Enumeration {
    type FilterType = String
    val Exact = "exact"
    val ExactSet = "exact:set"
    val SubstringSet = "substring:set"
    val Pattern = "pattern"
    val Level = "level"
    val Range = "range"
    val Sequence = "sequence"
}

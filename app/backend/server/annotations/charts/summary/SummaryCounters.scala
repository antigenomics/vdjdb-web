package backend.server.annotations.charts.summary

import play.api.libs.json.{Json, Writes}

case class SummaryCounters(counters: Seq[SummaryFieldCounter], notFoundCounter: SummaryClonotypeCounter)

object SummaryCounters {
    implicit val summaryCountersWrites: Writes[SummaryCounters] = Json.writes[SummaryCounters]
}

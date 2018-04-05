package backend.server.annotations.api.sample.update_stats

import play.api.libs.json.{Json, Writes}

case class UpdateSampleStatsInfoResponse(sampleName: String, readsCount: Long, clonotypesCount: Long)

object UpdateSampleStatsInfoResponse {
    final val Action: String = "update_sample_stats"

    implicit val updateSampleInfoResponseWrites: Writes[UpdateSampleStatsInfoResponse] = Json.writes[UpdateSampleStatsInfoResponse]
}
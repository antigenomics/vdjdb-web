package backend.server.annotations.api.sample.update

import play.api.libs.json.{Json, Writes}

case class UpdateSampleInfoResponse(sampleName: String, readsCount: Long, clonotypesCount: Long)

object UpdateSampleInfoResponse {
    final val Action: String = "update_sample"

    implicit val updateSampleInfoResponseWrites: Writes[UpdateSampleInfoResponse] = Json.writes[UpdateSampleInfoResponse]
}
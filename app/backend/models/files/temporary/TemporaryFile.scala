package backend.models.files.temporary

import java.sql.Date

case class TemporaryFile(id: Long, link: String, expiredAt: Date, metadataID: Long)

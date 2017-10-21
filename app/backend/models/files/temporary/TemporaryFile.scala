package backend.models.files.temporary

import java.sql.Date

case class TemporaryFile(id: Long, link: String, locked: Boolean, expiredAt: Date, metadataID: Long)

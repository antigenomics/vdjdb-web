/*
 *      Copyright 2017 Bagaev Dmitry
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

package backend.models.files.temporary

import java.sql.Timestamp

import backend.models.files.FileMetadataProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

import scala.language.higherKinds

class TemporaryFileTable(tag: Tag) extends Table[TemporaryFile](tag, TemporaryFileTable.TABLE_NAME) {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def link = column[String]("LINK", O.Length(32), O.Unique)
    def expiredAt = column[Timestamp]("EXPIRED_AT")
    def metadataID = column[Long]("METADATA_ID")

    def * = (id, link, expiredAt, metadataID) <> (TemporaryFile.tupled, TemporaryFile.unapply)
    def metadata = foreignKey("METADATA_FK", metadataID, FileMetadataProvider.table)(_.id,
        onUpdate = ForeignKeyAction.Cascade, onDelete = ForeignKeyAction.Cascade)

    def link_idx = index("LINK_IDX", link, unique = true)
}

object TemporaryFileTable {
    final val TABLE_NAME = "TEMPORARY_FILE"

    implicit class TemporaryFileExtension[C[_]](q: Query[TemporaryFileTable, TemporaryFile, C]) {
        def withMetadata = q.join(FileMetadataProvider.table).on(_.metadataID === _.id)
    }
}

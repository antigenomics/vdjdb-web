/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

package backend.models.files.sample

import backend.models.authorization.user.UserProvider
import backend.models.files.FileMetadataProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

import scala.language.higherKinds

class SampleFileTable(tag: Tag)(implicit fmp: FileMetadataProvider) extends Table[SampleFile](tag, SampleFileTable.TABLE_NAME){
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def sampleName = column[String]("SAMPLE_NAME", O.Length(64))
    def software = column[String]("SOFTWARE", O.Length(64))
    def readsCount = column[Long]("READS_COUNT")
    def clonotypesCount = column[Long]("CLONOTYPES_COUNT")
    def metadataID = column[Long]("METADATA_ID")
    def userID = column[Long]("USER_ID")

    def * = (id, sampleName, software, readsCount, clonotypesCount, metadataID, userID) <> (SampleFile.tupled, SampleFile.unapply)
    def metadata = foreignKey("METADATA_FK", metadataID, fmp.getTable)(_.id,
        onUpdate = ForeignKeyAction.Cascade, onDelete = ForeignKeyAction.Cascade)
}

object SampleFileTable {
    final val TABLE_NAME = "SAMPLE_FILE"

    implicit class SampleFileExtension[C[_]](q: Query[SampleFileTable, SampleFile, C]) {
        def withMetadata(implicit fmp: FileMetadataProvider) = q.join(fmp.getTable).on(_.metadataID === _.id)
        def withUser(implicit up: UserProvider) = q.join(up.getTable).on(_.userID === _.id)
    }
}

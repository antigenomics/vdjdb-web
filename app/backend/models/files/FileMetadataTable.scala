/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

package backend.models.files

import java.sql.Timestamp

import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

class FileMetadataTable(tag: Tag) extends Table[FileMetadata](tag, FileMetadataTable.TABLE_NAME) {
  def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)

  def fileName = column[String]("FILE_NAME", O.Length(128))

  def extension = column[String]("EXTENSION", O.Length(16))

  def path = column[String]("PATH", O.Length(512))

  def folder = column[String]("FOLDER", O.Length(512))

  def createdAt = column[Timestamp]("CREATED_AT")

  def * = (id, fileName, extension, path, folder, createdAt) <> (FileMetadata.tupled, FileMetadata.unapply)
}

object FileMetadataTable {
  final val TABLE_NAME = "FILE_METADATA"
}

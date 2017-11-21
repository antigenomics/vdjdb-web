/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.models.authorization.permissions

import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

class UserPermissionsTable(tag: Tag) extends Table[UserPermissions](tag, UserPermissionsTable.TABLE_NAME) {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def maxFilesCount = column[Int]("MAX_FILES_COUNT")
    def maxFileSize = column[Long]("MAX_FILE_SIZE")
    def isUploadAllowed = column[Boolean]("IS_UPLOAD_ALLOWED")
    def isDeleteAllowed = column[Boolean]("IS_DELETE_ALLOWED")

    def * = (id, maxFilesCount, maxFileSize, isUploadAllowed, isDeleteAllowed) <> (UserPermissions.tupled, UserPermissions.unapply)
}

object UserPermissionsTable {
    final val TABLE_NAME = "USER_PERMISSIONS"
}

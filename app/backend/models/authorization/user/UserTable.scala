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

package backend.models.authorization.user

import java.sql.Timestamp

import backend.models.authorization.permissions.UserPermissionsProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

import scala.language.higherKinds

class UserTable(tag: Tag)(implicit upp: UserPermissionsProvider) extends Table[User](tag, UserTable.TABLE_NAME) {
  def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)

  def login = column[String]("LOGIN", O.Length(64))

  def email = column[String]("EMAIL", O.Unique, O.Length(128))

  def verified = column[Boolean]("VERIFIED")

  def folderPath = column[String]("FOLDER_PATH", O.Length(255))

  def password = column[String]("PASSWORD", O.Length(255))

  def permissionID = column[Long]("PERMISSION_ID")

  def createIP = column[String]("CREATE_IP", O.Length(128))

  def isTemporary = column[Boolean]("IS_TEMPORARY")

  def createdOn = column[Timestamp]("CREATED_ON")

  def lastAccessedOn = column[Timestamp]("LAST_ACCESSED_ON")

  def * = (id, login, email, verified, folderPath, createIP, isTemporary, createdOn, lastAccessedOn, password, permissionID) <> (User.tupled, User.unapply)

  def permissions = foreignKey("PERMISSIONS_FK", permissionID, upp.getTable)(_.id,
    onUpdate = ForeignKeyAction.Cascade, onDelete = ForeignKeyAction.NoAction)

  def email_idx = index("EMAIL_IDX", email, unique = true)
}

object UserTable {
  final val TABLE_NAME = "USER"

  implicit class UserExtension[C[_]](q: Query[UserTable, User, C]) {
    def withPermissions(implicit upp: UserPermissionsProvider) = q.join(upp.getTable).on(_.permissionID === _.id)
  }

}

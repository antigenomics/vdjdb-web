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

package backend.models.authorization.user

import backend.models.authorization.permissions.UserPermissionsProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag
import scala.language.higherKinds

class UserTable(tag: Tag) extends Table[User](tag, "USER") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def login = column[String]("LOGIN", O.Length(64))
    def email = column[String]("EMAIL", O.Unique, O.Length(128))
    def verified = column[Boolean]("VERIFIED")
    def password = column[String]("PASSWORD", O.Length(255))
    def permissionID = column[Long]("PERMISSION_ID")

    def * = (id, login, email, verified, password, permissionID) <> (User.tupled, User.unapply)
    def permissions = foreignKey("PERMISSIONS_FK", permissionID, UserPermissionsProvider.table)(_.id,
        onUpdate = ForeignKeyAction.Cascade, onDelete = ForeignKeyAction.NoAction)

    def email_idx = index("EMAIL_IDX", email, unique = true)
}

object UserTable {
    implicit class UserExtension[C[_]](q: Query[UserTable, User, C]) {
        def withPermissions = q.join(UserPermissionsProvider.table).on(_.permissionID === _.id)
    }
}

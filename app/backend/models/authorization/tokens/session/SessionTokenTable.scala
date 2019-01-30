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

package backend.models.authorization.tokens.session

import java.sql.Timestamp

import backend.models.authorization.user.UserProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

import scala.language.higherKinds

class SessionTokenTable(tag: Tag) extends Table[SessionToken](tag, SessionTokenTable.TABLE_NAME) {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def token = column[String]("TOKEN", O.Length(255), O.Unique)
    def lastUsage = column[Timestamp]("LAST_USAGE")
    def userID = column[Long]("USER_ID")

    def * = (id, token, lastUsage, userID) <> (SessionToken.tupled, SessionToken.unapply)
    def token_idx = index("SESSION_TOKEN_IDX", token, unique = true)
}

object SessionTokenTable {
    final val TABLE_NAME = "SESSION_TOKEN"

    implicit class SessionExtension[C[_]](q: Query[SessionTokenTable, SessionToken, C]) {
        def withUser(implicit up: UserProvider) = q.join(up.getTable).on(_.userID === _.id)
    }
}

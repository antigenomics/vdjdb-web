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
 */

package backend.models.authorization.tokens.verification

import java.sql.Timestamp

import backend.models.authorization.user.UserProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag
import scala.language.higherKinds

class VerificationTokenTable(tag: Tag) extends Table[VerificationToken](tag, VerificationTokenTable.TABLE_NAME) {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def token = column[String]("TOKEN", O.Unique, O.Length(128))
    def userID = column[Long]("USER_ID")
    def expiredAt = column[Timestamp]("EXPIRED_AT")

    def * = (id, token, userID, expiredAt) <> (VerificationToken.tupled, VerificationToken.unapply)

    def token_idx = index("TOKEN_IDX", token, unique = true)
}

object VerificationTokenTable {
    final val TABLE_NAME = "VERIFICATION_TOKEN"

    implicit class ResetExtension[C[_]](q: Query[VerificationTokenTable, VerificationToken, C]) {
        def withUser(implicit up: UserProvider) = q.join(up.getTable).on(_.userID === _.id)
    }
}

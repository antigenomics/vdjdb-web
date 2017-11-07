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

package backend.models.authorization.verification

import java.sql.Timestamp
import javax.inject.{Inject, Singleton}

import backend.utils.CommonUtils
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery
import scala.concurrent.{ExecutionContext, Future}
import scala.async.Async.{async, await}

@Singleton
class VerificationTokenProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                                         (implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {
    import dbConfig.profile.api._

    def getAll: Future[Seq[VerificationToken]] = db.run(VerificationTokenProvider.table.result)

    def getExpired(date: Timestamp): Future[Seq[VerificationToken]] = {
        db.run(VerificationTokenProvider.table.filter(_.expiredAt < date).result)
    }

    def get(token: String): Future[Option[VerificationToken]] = {
        db.run(VerificationTokenProvider.table.filter(_.token === token).result.headOption)
    }

    def delete(id: Long): Future[Int] = {
        db.run(VerificationTokenProvider.table.filter(_.id === id).delete)
    }

    def delete(token: VerificationToken): Future[Int] = {
        delete(token.id)
    }

    def delete(tokens: Seq[VerificationToken]): Future[Int] = {
        val ids = tokens.map(_.id)
        db.run(VerificationTokenProvider.table.filter(fm => fm.id inSet ids).delete)
    }

    def createVerificationToken(userID: Long, expiredAt: Timestamp): Future[VerificationToken] = async {
        val random = CommonUtils.randomAlphaNumericString(128)
        val token = VerificationToken(0, random, userID, expiredAt)
        val success = await(insert(token))
        if (success == 1) {
            token
        } else {
            throw new RuntimeException("Cannot create verification token")
        }
    }

    private def insert(token: VerificationToken): Future[Int] = {
        db.run(VerificationTokenProvider.table += token)
    }
}

object VerificationTokenProvider {
    private[authorization] final val table = TableQuery[VerificationTokenTable]
}

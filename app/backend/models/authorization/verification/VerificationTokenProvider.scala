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

import akka.actor.ActorSystem
import backend.models.authorization.user.{User, UserProvider}
import backend.utils.{CommonUtils, TimeUtils}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.duration._
import scala.language.postfixOps
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Failure
import scala.async.Async.{async, await}

@Singleton
class VerificationTokenProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                                         (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem) extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    private final val configuration = conf.get[VerificationTokenConfiguration]("application.auth.verification")

    import dbConfig.profile.api._

    if (configuration.interval != 0) {
        system.scheduler.schedule(configuration.interval seconds, configuration.interval seconds) {
            deleteExpired onComplete {
                case Failure(ex) =>
                    logger.error("Cannot delete expired tokens", ex)
                case _ =>
            }
        }
    }

    def getAll: Future[Seq[VerificationToken]] = db.run(VerificationTokenProvider.table.result)

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

    def deleteExpired(): Future[Int] = async {
        val currentDate = new Timestamp(new java.util.Date().getTime)
        val expired = await(db.run(VerificationTokenProvider.table.join(UserProvider.table).on(_.userID === _.id).filter(_._1.expiredAt < currentDate).result))
        val userIDs = expired.map(_._2).map(_.id)
        val _ = await(db.run(UserProvider.table.filter(fm => fm.id inSet userIDs).delete))
        await(delete(expired.map(_._1)))
    }

    def createVerificationToken(userID: Long, expiredAt: Timestamp = TimeUtils.getExpiredAt(configuration.keep)): Future[VerificationToken] = async {
        val random = CommonUtils.randomAlphaNumericString(128)
        val token = VerificationToken(0, random, userID, expiredAt)
        val success = await(insert(token))
        if (success == 1) {
            token
        } else {
            throw new RuntimeException("Cannot create verification token")
        }
    }

    def verify(token: String): Future[Int] = async {
        val verificationToken = await(get(token))
        if (verificationToken.nonEmpty) {
            val userOpt = await(db.run(UserProvider.table.filter(_.id === verificationToken.get.userID).result.headOption))
            if (userOpt.nonEmpty) {
                val user = userOpt.get
                await(db.run(UserProvider.table.filter(_.id === user.id).update(
                    User(user.id, user.login, user.email, verified = true, user.password, user.permissionID))
                ).flatMap(_ => delete(verificationToken.get)))
            } else {
                0
            }
        } else {
            0
        }
    }

    private def insert(token: VerificationToken): Future[Int] = {
        db.run(VerificationTokenProvider.table += token)
    }
}

object VerificationTokenProvider {
    private[authorization] final val table = TableQuery[VerificationTokenTable]
}

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

package backend.models.authorization.session

import java.sql.Timestamp
import javax.inject.{Inject, Singleton}

import akka.actor.ActorSystem
import backend.models.authorization.user.User
import backend.utils.{CommonUtils, TimeUtils}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.jdbc.meta.MTable
import slick.lifted.TableQuery

import scala.language.postfixOps
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Failure

@Singleton
class SessionTokenProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                           (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem) extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    private final val configuration = conf.get[SessionTokenConfiguration]("application.auth.session")

    import dbConfig.profile.api._

    if (configuration.interval != 0) {
        system.scheduler.schedule(configuration.interval seconds, configuration.interval seconds) {
            deleteExpired onComplete {
                case Failure(ex) =>
                    logger.error("Cannot delete expired session tokens", ex)
                case _ =>
            }
        }
    }

    def getAll: Future[Seq[SessionToken]] = db.run(SessionTokenProvider.table.result)

    def get(id: Long): Future[Option[SessionToken]] = {
        val rows = SessionTokenProvider.table.filter(_.id === id)
        val query = db.run(rows.result.headOption)
        query onComplete { _ => db.run(rows.map(_.lastUsage).update(TimeUtils.getCurrentTimestamp)) }
        query
    }

    def get(token: String): Future[Option[SessionToken]] = {
        val rows = SessionTokenProvider.table.filter(_.token === token)
        val query = db.run(rows.result.headOption)
        query onComplete { _ => db.run(rows.map(_.lastUsage).update(TimeUtils.getCurrentTimestamp)) }
        query
    }

    def getWithUser(id: Long): Future[Option[(SessionToken, User)]] = {
        val rows = SessionTokenProvider.table.withUser.filter(_._1.id === id)
        val query = db.run(rows.result.headOption)
        query onComplete { _ => db.run(rows.map(_._1.lastUsage).update(TimeUtils.getCurrentTimestamp))}
        query
    }

    def getWithUser(token: String): Future[Option[(SessionToken, User)]] = {
        val rows = SessionTokenProvider.table.withUser.filter(_._1.token === token)
        val query = db.run(rows.result.headOption)
        query onComplete { _ => db.run(rows.map(_._1.lastUsage).update(TimeUtils.getCurrentTimestamp))}
        query
    }

    def delete(id: Long): Future[Int] = {
        db.run(SessionTokenProvider.table.filter(_.id === id).delete)
    }

    def delete(token: String): Future[Int] = {
        db.run(SessionTokenProvider.table.filter(_.token === token).delete)
    }

    def delete(ids: Seq[Long]): Future[Int] = {
        db.run(SessionTokenProvider.table.filter(t => t.id inSet ids).delete)
    }

    def deleteExpired(): Future[Int] = {
        db.run(MTable.getTables).flatMap(tables => {
            if (tables.exists(_.name.name == SessionTokenTable.TABLE_NAME)) {
                val checkDate = new Timestamp(new java.util.Date().getTime - configuration.keep * 1000)
                db.run(SessionTokenProvider.table.filter(_.lastUsage < checkDate).delete)
            } else {
                Future.successful(0)
            }
        })

    }

    def createSessionToken(user: User): Future[String] = {
        if (!user.verified) throw new RuntimeException("Cannot create session for unverified user")
        val token = CommonUtils.randomAlphaNumericString(255)
        db.run(SessionTokenProvider.table += SessionToken(0, token, TimeUtils.getCurrentTimestamp, user.id)).map(_ => token)
    }
}

object SessionTokenProvider {
    private final val table = TableQuery[SessionTokenTable]
}

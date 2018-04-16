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

package backend.models.authorization.tokens.reset

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import akka.actor.{ActorSystem, Cancellable}
import backend.models.authorization.user.{User, UserProvider}
import backend.utils.{CommonUtils, TimeUtils}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.inject.ApplicationLifecycle
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.jdbc.meta.MTable

import scala.concurrent.{ExecutionContext, Future}
import scala.util.Failure
import scala.language.postfixOps
import scala.concurrent.duration._

@Singleton
class ResetTokenProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider, lifecycle: ApplicationLifecycle)
                                    (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem)
    extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    private final val configuration = conf.get[ResetTokenConfiguration]("application.auth.reset")

    import dbConfig.profile.api._
    private final val table = TableQuery[ResetTokenTable]
    private final val deleteScheduler: Option[Cancellable] = Option(configuration.interval.getSeconds != 0).collect {
        case true => system.scheduler.schedule(configuration.interval.getSeconds seconds, configuration.interval.getSeconds seconds) {
            deleteExpired onComplete {
                case Failure(ex) =>
                    logger.warn("Cannot delete expired reset tokens", ex)
                case _ =>
            }
        }
    }

    lifecycle.addStopHook { () => Future.successful(deleteScheduler.foreach(_.cancel())) }

    def getTable: TableQuery[ResetTokenTable] = table

    def getAll: Future[Seq[ResetToken]] = db.run(table.result)

    def get(id: Long): Future[Option[ResetToken]] = {
        db.run(table.filter(_.id === id).result.headOption)
    }

    def get(token: String): Future[Option[ResetToken]] = {
        db.run(table.filter(_.token === token).result.headOption)
    }

    def getWithUser(id: Long)(implicit up: UserProvider): Future[Option[(ResetToken, User)]] = {
        db.run(table.withUser.filter(_._1.id === id).result.headOption)
    }

    def getWithUser(token: String)(implicit up: UserProvider): Future[Option[(ResetToken, User)]] = {
        db.run(table.withUser.filter(_._1.token === token).result.headOption)
    }

    def getByUserID(userID: Long): Future[Option[ResetToken]] = {
        db.run(table.filter(_.userID === userID).result.headOption)
    }

    def delete(id: Long): Future[Int] = {
        db.run(table.filter(_.id === id).delete)
    }

    def delete(token: String): Future[Int] = {
        db.run(table.filter(_.token === token).delete)
    }

    def delete(ids: Seq[Long]): Future[Int] = {
        db.run(table.filter(t => t.id inSet ids).delete)
    }

    def deleteExpired(): Future[Int] = {
        db.run(MTable.getTables).flatMap(tables => {
            if (tables.exists(_.name.name == ResetTokenTable.TABLE_NAME)) {
                db.run(table.filter(_.expiredAt < TimeUtils.getCurrentTimestamp).delete)
            } else {
                Future.successful(0)
            }
        })
    }

    def createResetToken(user: User, expiredAt: Timestamp = TimeUtils.getExpiredAt(configuration.keep)): Future[String] = {
        val token = CommonUtils.randomAlphaNumericString(32)
        db.run(table += ResetToken(0, token, expiredAt, user.id)).map(_ => token)
    }

}

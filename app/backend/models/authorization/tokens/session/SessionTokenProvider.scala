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

import akka.actor.{ActorSystem, Cancellable}
import backend.models.authorization.user.{User, UserProvider}
import backend.utils.{CommonUtils, TimeUtils}
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.inject.ApplicationLifecycle
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.jdbc.meta.MTable

import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.postfixOps
import scala.util.Failure

@Singleton
class SessionTokenProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider, lifecycle: ApplicationLifecycle)(
  implicit ec: ExecutionContext,
  conf: Configuration,
  system: ActorSystem
) extends HasDatabaseConfigProvider[JdbcProfile] {
  final private val logger                  = LoggerFactory.getLogger(this.getClass)
  final private val configuration           = conf.get[SessionTokenConfiguration]("application.auth.session")
  final private val AUTH_TOKEN_SESSION_NAME = "auth_token"

  import dbConfig.profile.api._

  final private val table = TableQuery[SessionTokenTable]
  final private val deleteScheduler: Option[Cancellable] = Option(configuration.interval.getSeconds != 0).collect {
    case true =>
      system.scheduler.schedule(configuration.interval.getSeconds seconds, configuration.interval.getSeconds seconds) {
        deleteExpired onComplete {
          case Failure(ex) =>
            logger.warn("Cannot delete expired session tokens", ex)
          case _ =>
        }
      }
  }

  lifecycle.addStopHook { () =>
    Future.successful(deleteScheduler.foreach(_.cancel()))
  }

  def getAuthTokenSessionName: String = AUTH_TOKEN_SESSION_NAME

  def getTable: TableQuery[SessionTokenTable] = table

  def getAll: Future[Seq[SessionToken]] = db.run(table.result)

  def get(id: Long): Future[Option[SessionToken]] = {
    val rows  = table.filter(_.id === id)
    val query = db.run(rows.result.headOption)
    query onComplete { _ =>
      db.run(rows.map(_.lastUsage).update(TimeUtils.getCurrentTimestamp))
    }
    query
  }

  def get(token: String): Future[Option[SessionToken]] = {
    val rows  = table.filter(_.token === token)
    val query = db.run(rows.result.headOption)
    query onComplete { _ =>
      db.run(rows.map(_.lastUsage).update(TimeUtils.getCurrentTimestamp))
    }
    query
  }

  def getWithUser(id: Long)(implicit up: UserProvider): Future[Option[(SessionToken, User)]] = {
    val query = db.run(table.withUser.filter(_._1.id === id).result.headOption)
    query onComplete { _ =>
      db.run(table.filter(_.id === id).map(_.lastUsage).update(TimeUtils.getCurrentTimestamp))
    }
    query
  }

  def getWithUser(token: String, touchUser: Boolean = false)(implicit up: UserProvider): Future[Option[(SessionToken, User)]] = {
    val query = db.run(table.withUser.filter(_._1.token === token).result.headOption)
    query onComplete { _ =>
      db.run(table.filter(_.token === token).map(_.lastUsage).update(TimeUtils.getCurrentTimestamp))
    }
    if (touchUser) {
      query onComplete { t =>
        t.foreach(u => u.foreach(e => up.touch(e._2.id)))
      }
      query
    } else {
      query
    }
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
    db.run(MTable.getTables)
      .flatMap(tables => {
        if (tables.exists(_.name.name == SessionTokenTable.TABLE_NAME)) {
          val checkDate = new Timestamp(new java.util.Date().getTime - configuration.keep.getSeconds * 1000)
          db.run(table.filter(_.lastUsage < checkDate).delete)
        } else {
          Future.successful(0)
        }
      })
  }

  def createSessionToken(user: User): Future[String] = {
    if (!user.verified) throw new Exception("Cannot create session for unverified user")
    val token = CommonUtils.randomAlphaNumericString(255)
    db.run(table += SessionToken(0, token, TimeUtils.getCurrentTimestamp, user.id)).map(_ => token)
  }
}

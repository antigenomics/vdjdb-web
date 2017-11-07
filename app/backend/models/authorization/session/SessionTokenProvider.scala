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

import javax.inject.Singleton

import akka.actor.ActorSystem
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class SessionTokenProvider (@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                           (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem) extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    private final val configuration = conf.get[SessionTokenConfiguration]("application.auth.session")

    import dbConfig.profile.api._

//    if (configuration.interval != 0) {
//        system
//    }

    def get(id: Long): Future[Option[SessionToken]] = {
        db.run(SessionTokenProvider.table.filter(_.id === id).result.headOption)
    }
}

object SessionTokenProvider {
    private final val table = TableQuery[SessionTokenTable]
}

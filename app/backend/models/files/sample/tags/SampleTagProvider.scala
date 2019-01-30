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

package backend.models.files.sample.tags

import akka.actor.ActorSystem
import backend.models.authorization.user.User
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.db.NamedDatabase
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.jdbc.JdbcProfile

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class SampleTagProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                                 (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem)
    extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    import dbConfig.profile.api._
    private final val table = TableQuery[SampleTagTable]

    def getTable: TableQuery[SampleTagTable] = table

    def getAll: Future[Seq[SampleTag]] = {
        db.run(table.result)
    }

    def get(id: Long): Future[Option[SampleTag]] = {
        db.run(table.filter(_.id === id).result.headOption)
    }

    def getByIdAndUser(id: Long, user: User): Future[Option[SampleTag]] = {
        db.run(table.filter((t) => t.id === id && t.userID === user.id).result.headOption)
    }

    def getByUserID(id: Long): Future[Seq[SampleTag]] = {
        db.run(table.filter(_.userID === id).result)
    }

    def getByUser(user: User): Future[Seq[SampleTag]] = {
        getByUserID(user.id)
    }

    def delete(tag: SampleTag): Future[Int] = {
        db.run(table.filter(_.id === tag.id).delete)
    }

    def update(tag: SampleTag, name: String, color: String): Future[Int] = {
        db.run(table.filter(_.id === tag.id).map((tag) => (tag.name, tag.color)).update((name, color)))
    }

    def insert(tag: SampleTag): Future[Long] = {
        db.run(table returning table.map(_.id) += tag)
    }
}

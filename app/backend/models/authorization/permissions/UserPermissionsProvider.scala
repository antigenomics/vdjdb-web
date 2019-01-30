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

package backend.models.authorization.permissions

import groovy.lang.Singleton
import javax.inject.Inject
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class UserPermissionsProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                                       (implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {

  import dbConfig.profile.api._

  private final val table = TableQuery[UserPermissionsTable]

  def getTable: TableQuery[UserPermissionsTable] = table

  def getAll: Future[Seq[UserPermissions]] = {
    db.run(table.result)
  }

  def getByID(id: Long): Future[Option[UserPermissions]] = {
    db.run(table.filter(_.id === id).result.headOption)
  }
}

object UserPermissionsProvider {
  final val UNLIMITED_ID: Long = 0L
  final val DEFAULT_ID: Long = 1L
  final val DEMO_ID: Long = 2L
}

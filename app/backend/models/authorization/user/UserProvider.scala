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

package backend.models.authorization.user

import javax.inject.{Inject, Singleton}

import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class UserProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                            (implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {
    import dbConfig.profile.api._

    def getAll: Future[Seq[User]] = {
        db.run(UserProvider.table.result)
    }

    def get(email: String): Future[Option[User]] = {
        db.run(UserProvider.table.filter(_.email === email).result.headOption)
    }

    def getWithPermissions(email: String): Future[Option[(User, UserPermissions)]] = {
        db.run(UserProvider.table.withPermissions.filter(_._1.email === email).result.headOption)
    }

    def addUser(login: String, email: String, password: String): Future[Int] = {
        db.run(UserProvider.table += User(0, login, email, password, UserPermissionsProvider.DEFAULT_ID))
    }
}

object UserProvider {
    private[authorization] final val table = TableQuery[UserTable]
}
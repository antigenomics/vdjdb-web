package backend.models.authorization.user

import javax.inject.{Inject, Singleton}

import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class UserProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                            (implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val UsersTable = TableQuery[UserTable]
    import dbConfig.profile.api._

    def getAll: Future[Seq[User]] = {
        db.run(UsersTable.result)
    }

    def addUser(name: String, email: String): Future[Boolean] = {
        db.run(UsersTable += User(0, name, email)).map(_ == 1)
    }
}
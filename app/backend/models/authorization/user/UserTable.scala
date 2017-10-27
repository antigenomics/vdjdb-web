package backend.models.authorization.user

import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

class UserTable(tag: Tag) extends Table[User](tag, "USER") {
    def id = column[Int]("ID", O.PrimaryKey, O.AutoInc)
    def name = column[String]("NAME")
    def email = column[String]("EMAIL")

    def * = (id, name, email) <> (User.tupled, User.unapply)
}

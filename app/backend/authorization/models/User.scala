package backend.authorization.models

import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

class User(tag: Tag) extends Table[(Int, String)](tag, "USER") {
    def id = column[Int]("USER_ID", O.PrimaryKey, O.AutoInc)
    def name = column[String]("USER_NAME")

    def * = (id, name)
}

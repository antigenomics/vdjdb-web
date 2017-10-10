package backend.controllers

import javax.inject.Inject

import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.mvc.{AbstractController, ControllerComponents}
import slick.jdbc.JdbcProfile

import scala.concurrent.ExecutionContext

class Authorization @Inject() (protected val dbConfigProvider: DatabaseConfigProvider, cc: ControllerComponents)(implicit ec: ExecutionContext)
    extends AbstractController(cc) with HasDatabaseConfigProvider[JdbcProfile] {
        import dbConfig.profile.api._

        def testController = Action {

            Ok(frontend.views.html.authorization.login())
        }

    }

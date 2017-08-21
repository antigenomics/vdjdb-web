package backend.controllers

import javax.inject._
import play.api._
import play.api.mvc._
import backend.server.database.Database
import play.api.libs.json.Json.toJson

class SearchAPI @Inject()(environment: Environment, cc: ControllerComponents, database: Database) extends AbstractController(cc) {

    def meta = Action {
        Ok(toJson(database.getColumns))
    }

}

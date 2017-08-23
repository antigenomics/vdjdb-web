package backend.controllers

import javax.inject._

import akka.actor.ActorSystem
import akka.stream.Materializer
import play.api.mvc._
import backend.server.database.{Database, DatabaseColumnInfo, DatabaseMetadata}
import backend.server.messages.SuccessMessage
import play.api.libs.json.Json
import play.api.libs.json.Json.toJson

class DatabaseAPI @Inject() (cc: ControllerComponents, database: Database) (implicit system: ActorSystem, mat: Materializer) extends AbstractController(cc) {

    case class DatabaseMetaSuccessMessage(metadata: DatabaseMetadata) extends SuccessMessage("api.database.metadata")
    implicit val databaseMetaSuccessMessageWrites = SuccessMessage.writes(Json.writes[DatabaseMetaSuccessMessage])
    def meta = Action {
        Ok(toJson(DatabaseMetaSuccessMessage(database.getMetadata)))
    }

    def columnInfo(columnName: String) = Action {
        val column = database.getMetadata.columns.find((i: DatabaseColumnInfo) => i.name == columnName)
        if (column.nonEmpty) {
            Ok(toJson(column))
        } else {
            Ok(toJson("Not found"))
        }
    }

}

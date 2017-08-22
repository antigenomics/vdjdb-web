package backend.controllers

import javax.inject._

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.Flow

import play.api.mvc._
import backend.server.database.{Database, DatabaseColumnInfo}
import play.api.libs.json.JsValue
import play.api.libs.json.Json.toJson

class SearchAPI @Inject() (cc: ControllerComponents, database: Database) (implicit system: ActorSystem, mat: Materializer) extends AbstractController(cc) {

    def meta = Action {
        Ok(toJson(database.getMetadata))
    }

    def columnInfo(columnName: String) = Action {
        val column = database.getMetadata.columns.find((i: DatabaseColumnInfo) => i.name == columnName)
        if (column.nonEmpty) {
            Ok(toJson(column))
        } else {
            Ok(toJson("Not found"))
        }
    }

    def connect = WebSocket.accept[JsValue, JsValue] { request =>
        Flow[JsValue].map { msg =>
            println(msg)
            toJson(database.getMetadata)
        }
    }

}

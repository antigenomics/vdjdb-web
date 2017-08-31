package backend.controllers

import javax.inject._

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import play.api.mvc._
import backend.server.database.{Database, DatabaseColumnInfo, DatabaseMetadata}
import backend.server.messages.{ErrorMessage, SuccessMessage, WarningMessage}
import play.api.libs.json._
import play.api.libs.json.Json.toJson

class DatabaseAPI @Inject()(cc: ControllerComponents, database: Database)(implicit system: ActorSystem, mat: Materializer) extends AbstractController(cc) {

    def meta = Action {
        Ok(toJson(SuccessMessage("api.database.meta", toJson(database.getMetadata))))
    }

    def columnInfo(columnName: String) = Action {
        val action = "api.database.meta.columnInfo"
        val column = database.getMetadata.columns.find((i: DatabaseColumnInfo) => i.name == columnName)
        if (column.nonEmpty) {
            Ok(toJson(SuccessMessage(action, toJson(column.get))))
        } else {
            BadRequest(toJson(ErrorMessage(action, toJson("Invalid column name"))))
        }
    }


    case class WebSocketConnectionRequest(action: String, data: JsValue)
    implicit val webSocketConnectionRequestReader = Json.reads[WebSocketConnectionRequest]

    def connect = WebSocket.accept[JsValue, JsValue] { _ =>
        Flow[JsValue].map { message =>
            val validation: JsResult[WebSocketConnectionRequest] = message.validate[WebSocketConnectionRequest]
            validation match {
                case s: JsSuccess[WebSocketConnectionRequest] =>
                    val action = s.get.action
                    action match {
                        case "meta" =>
                            toJson(SuccessMessage(action, toJson(database.getMetadata)))
                        case "ping" =>
                            toJson(SuccessMessage(action, toJson("pong")))
                        case _ =>
                            toJson(WarningMessage(action, toJson("Invalid action")))
                    }
                case e: JsError =>
                    toJson(ErrorMessage("Unknown action", JsError.toJson(e)))
            }


        }
    }

}

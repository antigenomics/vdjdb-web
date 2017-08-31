package backend.controllers

import javax.inject._

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import backend.server.database.{Database, DatabaseColumnInfo}
import backend.server.filters.{DatabaseFilters, RequestFilter}
import backend.server.messages.{ErrorMessage, SuccessMessage}
import backend.server.table.search_table.SearchTableResults
import play.api.libs.json.Json.toJson
import play.api.libs.json._
import play.api.mvc._

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
        val searchResults: SearchTableResults = SearchTableResults()

        Flow[JsValue].map { message =>
            val validation: JsResult[WebSocketConnectionRequest] = message.validate[WebSocketConnectionRequest]
            validation match {
                case s: JsSuccess[WebSocketConnectionRequest] =>
                    val action = s.get.action
                    action match {
                        case "meta" =>
                            toJson(SuccessMessage(action, toJson(database.getMetadata)))
                        case "search" =>
                            val filtersRequestValidation: JsResult[List[RequestFilter]] = s.get.data.validate[List[RequestFilter]]
                            filtersRequestValidation match {
                                case fs: JsSuccess[List[RequestFilter]] =>
                                    val filtersRequest: List[RequestFilter] = fs.get
                                    val filters: DatabaseFilters = DatabaseFilters.createFromRequest(filtersRequest, database)
                                    searchResults.update(filters, database)
                                    toJson(SuccessMessage(action, toJson(searchResults.getPage(0))))
                                case fe: JsError =>
                                    toJson(ErrorMessage(action, JsError.toJson(fe)))
                            }
                        case "page" =>
                            val pageNumberValidation: JsResult[Int] = s.get.data.validate[Int]
                            pageNumberValidation match {
                                case ps: JsSuccess[Int] =>
                                    toJson(SuccessMessage(action, toJson(searchResults.getPage(ps.get))))
                                case pe: JsError =>
                                    toJson(ErrorMessage(action, JsError.toJson(pe)))
                            }
                        case "ping" =>
                            toJson(SuccessMessage(action, toJson("pong")))
                        case _ =>
                            toJson(ErrorMessage(action, toJson("Invalid action")))
                    }
                case e: JsError =>
                    toJson(ErrorMessage("Unknown action", JsError.toJson(e)))
            }


        }
    }

}

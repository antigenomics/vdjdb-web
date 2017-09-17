package backend.controllers

import javax.inject._

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.actors.DatabaseSearchWebsocketActor
import backend.server.api.database.{DatabaseColumnInfoResponse, DatabaseMetadataResponse}
import backend.server.api.search.{SearchDataRequest, SearchResponse}
import backend.server.database.{Database, DatabaseColumnInfo}
import backend.server.filters.DatabaseFilters
import backend.server.table.search.SearchTable
import play.api.libs.json.Json.toJson
import play.api.libs.json._
import play.api.libs.streams.ActorFlow
import play.api.mvc._

class DatabaseAPI @Inject()(cc: ControllerComponents, database: Database)(implicit system: ActorSystem, mat: Materializer) extends AbstractController(cc) {

    def meta = Action {
        Ok(toJson(DatabaseMetadataResponse(database.getMetadata)))
    }

    def columnInfo(columnName: String) = Action {
        val column = database.getMetadata.columns.find((i: DatabaseColumnInfo) => i.name == columnName)
        if (column.nonEmpty) {
            Ok(toJson(DatabaseColumnInfoResponse(column.get)))
        } else {
            BadRequest(DatabaseColumnInfoResponse.errorMessage)
        }
    }

    def search: Action[JsValue] = Action(parse.json) { implicit request =>
        request.body.validate[SearchDataRequest] match {
            case data: JsSuccess[SearchDataRequest] =>
                if (data.get.filters.nonEmpty) {
                    val table = new SearchTable()
                    val filters = DatabaseFilters.createFromRequest(data.get.filters.get, database)
                    table.update(filters, database)
                    if (data.get.sort.nonEmpty) {
                        val sorting = data.get.sort.get.split(":")
                        val columnName = sorting(0)
                        val sortType = sorting(1)
                        table.sort(columnName, sortType)
                    }
                    if (data.get.page.nonEmpty) {
                        val pageSize: Int = data.get.pageSize.getOrElse(100)
                        val page = data.get.page.get
                        table.setPageSize(pageSize)
                        Ok(toJson(SearchResponse(page, pageSize, table.getPageCount, table.getCount, table.getPage(page))))
                    } else {
                        Ok(toJson(SearchResponse(-1, -1, table.getPageCount, table.getCount, table.getRows)))
                    }
                } else {
                    BadRequest(SearchResponse.errorMessage)
                }
            case _: JsError =>
                BadRequest(SearchResponse.errorMessage)
        }
    }

    def connect: WebSocket = WebSocket.accept[JsValue, JsValue] { _ =>
        ActorFlow.actorRef { out =>
            DatabaseSearchWebsocketActor.props(out, database)
        }
    }

}

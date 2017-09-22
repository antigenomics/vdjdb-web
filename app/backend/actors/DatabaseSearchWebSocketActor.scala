package backend.actors

import akka.actor.{Actor, ActorRef, Props}
import backend.server.api.ClientRequest
import backend.server.api.common.{ErrorMessageResponse, SuccessMessageResponse, WarningMessageResponse}
import backend.server.api.database.DatabaseMetadataResponse
import backend.server.api.export.{ExportDataRequest, ExportDataResponse}
import backend.server.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.database.Database
import backend.server.filters.DatabaseFilters
import backend.server.table.search.SearchTable
import backend.server.table.search.export.SearchTableConverter
import play.api.libs.json.Json.toJson
import play.api.libs.json._


class DatabaseSearchWebSocketActor(out: ActorRef, val database: Database) extends Actor {
    var table: SearchTable = _

    override def preStart(): Unit = {
        super.preStart()
        table = new SearchTable()
    }

    override def receive: Receive = {
        case request: JsValue =>
            val validation: JsResult[ClientRequest] = request.validate[ClientRequest]
            validation match {
                case clientRequest: JsSuccess[ClientRequest] =>
                    handleMessage(out, clientRequest.get)
                case _: JsError =>
                    out ! ErrorMessageResponse("Invalid request")

            }
    }

    def handleMessage(out: ActorRef, request: ClientRequest): Unit = {
        request.action match {
            case Some(action) =>
                action match {
                    case DatabaseMetadataResponse.action =>
                        out ! toJson(DatabaseMetadataResponse(database.getMetadata))
                    case SearchDataResponse.action =>
                        validateData(out, request.data, (searchRequest: SearchDataRequest) => {

                            if (searchRequest.filters.nonEmpty) {
                                val filters: DatabaseFilters = DatabaseFilters.createFromRequest(searchRequest.filters.get, database)
                                filters.warnings.foreach((warningMessage: String) => {
                                    out ! toJson(WarningMessageResponse(warningMessage))
                                })
                                table.update(filters, database)
                            }

                            if (searchRequest.sort.nonEmpty) {
                                val sorting = searchRequest.sort.get.split(":")
                                val columnName = sorting(0)
                                val sortType = sorting(1)
                                table.sort(columnName, sortType)
                            }
                            val page = searchRequest.page.getOrElse(0)
                            out ! toJson(SearchDataResponse(page, table.getPageSize, table.getPageCount, table.getRecordsFound, table.getPage(page)))
                        })
                    case ExportDataResponse.action =>
                        validateData(out, request.data, (exportRequest: ExportDataRequest) => {
                            val converter = SearchTableConverter.getConverter(exportRequest.format)
                            if (converter.nonEmpty) {
                                val link = converter.get.convert(table, database, "/tmp")
                                if (link.nonEmpty) {
                                    val name = converter.get.getName
                                    val guard = converter.get.getGuard
                                    val hash = converter.get.getHash
                                    out ! toJson(ExportDataResponse(link.get, name, guard, hash))
                                }
                            }
                        })
                    case "ping" =>
                        out ! toJson(SuccessMessageResponse("pong"))
                    case _ =>
                        out ! toJson(ErrorMessageResponse("Invalid action"))
                }
            case None =>
        }
    }

    def validateData[T](out: ActorRef, data: Option[JsValue], callback: T => Unit)(implicit tr: Reads[T]): Unit = {
        if (data.nonEmpty) {
            val dataValidation: JsResult[T] = data.get.validate[T]
            dataValidation match {
                case success: JsSuccess[T] =>
                    callback(success.get)
                case _: JsError =>
                    out ! toJson(ErrorMessageResponse("Invalid request"))
            }
        } else {
            out ! toJson(ErrorMessageResponse("Empty data field"))
        }
    }
}

object DatabaseSearchWebSocketActor {
    def props(out: ActorRef, database: Database): Props = Props(new DatabaseSearchWebSocketActor(out, database))
}


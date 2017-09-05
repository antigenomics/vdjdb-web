package backend.actors.database

import akka.actor.{Actor, ActorRef, Props}
import backend.server.api.ClientRequest
import backend.server.api.common.{ErrorMessageResponse, SuccessMessageResponse}
import backend.server.api.database.DatabaseMetadataResponse
import backend.server.api.search.{SearchTableResultsDataRequest, SearchTableResultsResponse}
import backend.server.database.Database
import backend.server.filters.DatabaseFilters
import backend.server.table.search_table.SearchTableResults
import play.api.libs.json._
import play.api.libs.json.Json.toJson


class DatabaseWebsocketActor(out: ActorRef, val database: Database) extends Actor {
    var searchResults: SearchTableResults = _

    override def preStart(): Unit = {
        super.preStart()
        searchResults = new SearchTableResults()
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
                    case SearchTableResultsResponse.action =>
                        validateData(out, request.data, (searchRequest: SearchTableResultsDataRequest) => {
                            if (searchRequest.filters.nonEmpty) {
                                searchResults.update(DatabaseFilters.createFromRequest(searchRequest.filters.get, database), database)
                                out ! toJson(SearchTableResultsResponse(0, searchResults.getPageSize, searchResults.getCount, searchResults.getPage(0)))
                            } else if (searchRequest.page.nonEmpty) {
                                val page = searchRequest.page.get
                                out ! toJson(SearchTableResultsResponse(page, searchResults.getPageSize, searchResults.getCount, searchResults.getPage(page)))
                            } else {
                                out ! SearchTableResultsResponse.errorMessage
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

object DatabaseWebsocketActor {
    def props(out: ActorRef, database: Database): Props = Props(new DatabaseWebsocketActor(out, database))
}


/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.actors

import akka.actor.{Actor, ActorRef, ActorSystem, PoisonPill, Props}
import backend.server.api.ClientRequest
import backend.server.table.search.api.export.{ExportDataRequest, ExportDataResponse}
import backend.server.table.search.api.paired.{PairedDataRequest, PairedDataResponse}
import backend.server.table.search.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.database.Database
import backend.server.database.api.metadata.DatabaseMetadataResponse
import backend.server.database.api.suggestions.{DatabaseColumnSuggestionsRequest, DatabaseColumnSuggestionsResponse}
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}
import backend.server.limit.{IpLimit, RequestLimits}
import backend.server.table.search.SearchTable
import backend.server.table.search.export.SearchTableConverter
import play.api.libs.json._

import scala.concurrent.ExecutionContext


case class DatabaseSearchWebSocketActor(out: ActorRef, database: Database, actorSystem: ActorSystem, limit: IpLimit, requestLimits: RequestLimits)
                                       (implicit ec: ExecutionContext) extends Actor {
    private final val table: SearchTable = new SearchTable()

    override def receive: Receive = {
        case request: JsValue =>
            if (requestLimits.allowConnection(limit)) {
                val timeStart: Long = System.currentTimeMillis
                val validation: JsResult[ClientRequest] = request.validate[ClientRequest]
                validation match {
                    case clientRequest: JsSuccess[ClientRequest] =>
                        val request = clientRequest.get
                        request.action match {
                            case Some(action) =>
                                handleMessage(WebSocketOutActorRef(request.id, action, out), request.data)
                            case None =>
                        }
                    case _: JsError =>
                        out ! Json.toJson("Invalid request")
                }
                val timeEnd: Long = System.currentTimeMillis
                val timeSpent = timeEnd - timeStart
                requestLimits.updateLimits(limit, 1, timeSpent)
            } else {
                out ! PoisonPill
            }
        case _ =>
            out ! PoisonPill
    }

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case DatabaseMetadataResponse.Action =>
                out.success(DatabaseMetadataResponse(database.getMetadata))
            case DatabaseColumnSuggestionsResponse.Action =>
                validateData(out, data, (suggestionsRequest: DatabaseColumnSuggestionsRequest) => {
                    database.getSuggestions(suggestionsRequest.column) match {
                        case Some(suggestions) => out.success(suggestions)
                        case None => out.errorMessage("Invalid suggestions request")
                    }
                })
            case SearchDataResponse.Action =>
                validateData(out, data, (searchRequest: SearchDataRequest) => {
                    if (searchRequest.filters.nonEmpty) {
                        val filters: DatabaseFilters = DatabaseFilters.createFromRequest(searchRequest.filters.get, database)
                        filters.warnings.foreach((message: String) => {
                            out.warningMessage(message)
                        })
                        table.update(filters, database)
                    }

                    if (searchRequest.sort.nonEmpty) {
                        val sorting = searchRequest.sort.get.split(":")
                        val columnName = sorting(0)
                        val sortType = sorting(1)
                        table.sort(database.getMetadata.getColumnIndex(columnName), sortType)
                    }

                    if (searchRequest.pageSize.nonEmpty) {
                        table.setPageSize(searchRequest.pageSize.get)
                    }

                    if (!searchRequest.reconnect.getOrElse(false)) {
                        val page = searchRequest.page.getOrElse(0)
                        out.success(SearchDataResponse(page, table.getPageSize, table.getPageCount, table.getRecordsFound, table.getPage(page)))
                    } else {
                        out.handshake()
                    }
                })
            case PairedDataResponse.Action =>
                validateData(out, data, (pairedRequest: PairedDataRequest) => {
                    if (!pairedRequest.pairedID.contentEquals("0")) {
                        val pairedFilterRequest: List[DatabaseFilterRequest] = List(
                            DatabaseFilterRequest("complex.id", DatabaseFilterType.Exact, negative = false, pairedRequest.pairedID),
                            DatabaseFilterRequest("gene", DatabaseFilterType.Exact, negative = true, pairedRequest.gene)
                        )
                        val pairedFilters: DatabaseFilters = DatabaseFilters.createFromRequest(pairedFilterRequest, database)
                        val pairedTable: SearchTable = SearchTable()
                        pairedTable.update(pairedFilters, database)

                        if (pairedTable.getRecordsFound == 1) {
                            out.success(PairedDataResponse(Some(pairedTable.getRows.head), found = true))
                        } else {
                            out.error(PairedDataResponse(None, found = false))
                        }
                    } else {
                        out.error(PairedDataResponse(None, found = false))
                    }
                })
            case ExportDataResponse.Action =>
                validateData(out, data, (exportRequest: ExportDataRequest) => {
                    val converter = SearchTableConverter.getConverter(exportRequest.format)
                    if (converter.nonEmpty) {
                        val temporaryFileLink = converter.get.convert(table, database)
                        if (temporaryFileLink.nonEmpty) {
                            temporaryFileLink.get.autoremove(actorSystem)
                            out.success(ExportDataResponse(temporaryFileLink.get.getDownloadLink))
                        }
                    }
                })
            case "ping" =>
                out.handshake()
            case _ =>
                out.errorMessage("Invalid action")
        }
    }

    def validateData[T](out: WebSocketOutActorRef, data: Option[JsValue], callback: T => Unit)(implicit tr: Reads[T]): Unit = {
        if (data.nonEmpty) {
            val dataValidation: JsResult[T] = data.get.validate[T]
            dataValidation match {
                case success: JsSuccess[T] =>
                    callback(success.get)
                case _: JsError =>
                    out.errorMessage("Invalid request")
            }
        } else {
            out.errorMessage("Empty data field")
        }
    }
}

object DatabaseSearchWebSocketActor {
    def props(out: ActorRef, database: Database, actorSystem: ActorSystem, limit: IpLimit, requestLimits: RequestLimits)
             (implicit ec: ExecutionContext): Props =
        Props(new DatabaseSearchWebSocketActor(out, database, actorSystem, limit, requestLimits))
}


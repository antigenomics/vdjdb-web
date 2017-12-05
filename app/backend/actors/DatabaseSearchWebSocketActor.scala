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

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.files.temporary.TemporaryFileProvider
import backend.server.search.api.export.{ExportDataRequest, ExportDataResponse}
import backend.server.search.api.paired.{PairedDataRequest, PairedDataResponse}
import backend.server.search.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.database.Database
import backend.server.database.api.metadata.DatabaseMetadataResponse
import backend.server.database.api.suggestions.{DatabaseColumnSuggestionsRequest, DatabaseColumnSuggestionsResponse}
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}
import backend.server.limit.{IpLimit, RequestLimits}
import backend.server.search.SearchTable
import backend.server.search.export.SearchTableConverter
import play.api.libs.json._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}


class DatabaseSearchWebSocketActor(out: ActorRef, limit: IpLimit, database: Database)
                                  (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, tfp: TemporaryFileProvider)
    extends WebSocketActor(out, limit) {
    private final val table: SearchTable = new SearchTable()

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
                        val pairedTable: SearchTable = new SearchTable()
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
                        converter.get.convert(table, database) onComplete {
                            case Success(link) =>
                                out.success(ExportDataResponse(link.getDownloadLink))
                            case Failure(_) =>
                                out.warningMessage("Unable to export")
                        }
                    }
                })
            case _ =>
                out.errorMessage("Invalid action")
        }
    }
}

object DatabaseSearchWebSocketActor {
    def props(out: ActorRef, limit: IpLimit, database: Database)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, tfp: TemporaryFileProvider): Props =
        Props(new DatabaseSearchWebSocketActor(out, limit, database))
}


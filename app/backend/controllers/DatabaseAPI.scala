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

package backend.controllers

import javax.inject._

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.actors.DatabaseSearchWebSocketActor
import backend.server.database.api.metadata.{DatabaseColumnInfoResponse, DatabaseMetadataResponse}
import backend.server.table.search.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.database.{Database, DatabaseColumnInfo}
import backend.server.database.filters.DatabaseFilters
import backend.server.limit.RequestLimits
import backend.server.table.search.SearchTable
import play.api.libs.json.Json.toJson
import play.api.libs.json._
import play.api.libs.streams.ActorFlow
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class DatabaseAPI @Inject()(cc: ControllerComponents, database: Database, actorSystem: ActorSystem, limits: RequestLimits)
                           (implicit system: ActorSystem, mat: Materializer, ec: ExecutionContext) extends AbstractController(cc) {

    def summary = Action {
        database.getSummaryFile match {
            case Some(file) =>
                Ok.sendFile(content = file, fileName = _.getName, inline = true)
            case None =>
                BadRequest("No summary")
        }
    }

    def meta = Action {
        Ok(toJson(DatabaseMetadataResponse(database.getMetadata)))
    }

    def columnInfo(columnName: String) = Action {
        val column = database.getMetadata.columns.find((i: DatabaseColumnInfo) => i.name == columnName)
        if (column.nonEmpty) {
            Ok(toJson(DatabaseColumnInfoResponse(column.get)))
        } else {
            BadRequest("Invalid request")
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
                        Ok(toJson(SearchDataResponse(page, pageSize, table.getPageCount, table.getRecordsFound, table.getPage(page))))
                    } else {
                        Ok(toJson(SearchDataResponse(-1, -1, table.getPageCount, table.getRecordsFound, table.getRows)))
                    }
                } else {
                    BadRequest("Invalid request")
                }
            case _: JsError =>
                BadRequest("Invalid request")
        }
    }

    def connect: WebSocket = WebSocket.acceptOrResult[JsValue, JsValue] { request =>
        Future.successful(if (limits.allowConnection(request)) {
            Right(ActorFlow.actorRef { out =>
                DatabaseSearchWebSocketActor.props(out, database, actorSystem, limits.getLimit(request), limits)
            })
        } else {
            Left(Forbidden)
        })
    }

}

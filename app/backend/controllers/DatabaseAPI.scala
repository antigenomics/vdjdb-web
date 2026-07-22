/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.actors.DatabaseSearchWebSocketActor
import backend.models.files.temporary.TemporaryFileProvider
import backend.server.database.api.metadata.{DatabaseColumnInfoResponse, DatabaseMetadataResponse}
import backend.server.database.filters.DatabaseFilters
import backend.server.database.{Database, DatabaseColumnInfo}
import backend.server.limit.RequestLimits
import backend.server.motifs.Motifs
import backend.server.search.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.search.{SearchTable, SearchTableRow}
import backend.server.structures.Structures
import javax.inject._
import play.api.Configuration
import play.api.libs.json.Json.toJson
import play.api.libs.json._
import play.api.libs.streams.ActorFlow
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class DatabaseAPI @Inject()(cc: ControllerComponents, database: Database, structures: Structures, motifs: Motifs, configuration: Configuration)
                           (implicit as: ActorSystem, mat: Materializer, ec: ExecutionContext, limits: RequestLimits, tfp: TemporaryFileProvider)
  extends AbstractController(cc) {

  /** The summary is a static fragment regenerated only when the database itself is rebuilt, yet the
    * Overview page asked for it in full on every visit. An hour of freshness plus the entity tag below
    * turns the repeat visits into a conditional request that answers 304 almost every time. */
  private final val SummaryCacheControl: String = "public, max-age=3600"

  def summary: Action[AnyContent] = Action.async { request =>
    Future.successful {
      database.getSummaryFile match {
        case Some(file) =>
          val etag = "\"" + java.lang.Long.toHexString(file.lastModified()) + "-" +
            java.lang.Long.toHexString(file.length()) + "\""
          if (request.headers.get(IF_NONE_MATCH).exists(_.split(',').exists(_.trim == etag))) {
            NotModified.withHeaders(CACHE_CONTROL -> SummaryCacheControl, ETAG -> etag)
          } else {
            Ok.sendFile(content = file, fileName = _.getName, inline = true)
              .withHeaders(CACHE_CONTROL -> SummaryCacheControl, ETAG -> etag)
          }
        case None =>
          BadRequest("The database summary is not available for this release of VDJdb.")
      }
    }
  }

  def meta: Action[AnyContent] = Action.async {
    Future.successful {
      Ok(toJson(DatabaseMetadataResponse(database.getMetadata)))
    }
  }

  def columnInfo(columnName: String): Action[AnyContent] = Action.async {
    Future.successful {
      val column = database.getMetadata.columns.find((i: DatabaseColumnInfo) => i.name == columnName)
      if (column.nonEmpty) {
        Ok(toJson(DatabaseColumnInfoResponse(column.get)))
      } else {
        BadRequest("There is no such column in the database. Please check the spelling of the column name and try again.")
      }
    }
  }

  def search: Action[JsValue] = Action(parse.json).async { implicit request =>
    Future.successful {
      request.body.validate[SearchDataRequest] match {
        case data: JsSuccess[SearchDataRequest] =>
          if (data.get.filters.nonEmpty) {
            val table = new SearchTable()
            val filters = DatabaseFilters.createFromRequest(data.get.filters.get, database)

            table.update(filters, database, structures, motifs)
            if (data.get.sort.nonEmpty) {
              val sorting = data.get.sort.get.split(":")
              val columnName = sorting(0)
              val sortType = sorting(1)
              table.sort(database.getMetadata.getColumnIndex(columnName), sortType)
            }

            var pageSize: Int = -1
            var page: Int = -1
            var pageCount: Int = -1
            var rows: Seq[SearchTableRow] = Seq()

            if (data.get.page.nonEmpty) {
              pageSize = data.get.pageSize.getOrElse(25)
              page = data.get.page.get
              table.setPageSize(pageSize)
              pageCount = table.getPageCount
              rows = table.getPage(page)
            } else {
              rows = table.getRows
            }

            val paired = data.get.paired.getOrElse(false)
            if (paired) {
              val pairedRows = SearchTable.getPairedRows(rows, database)
              rows = rows ++ pairedRows
            }

            Ok(toJson(SearchDataResponse(page, pageSize, pageCount, table.getRecordsFound, rows)))
          } else {
            BadRequest("No search filters were given. Please add at least one filter (an epitope, a gene or a species) and search again.")
          }
        case _: JsError =>
          BadRequest("The search query could not be read. Please reset the filters and run the search again.")
      }
    }
  }

  def connect: WebSocket = WebSocket.acceptOrResult[JsValue, JsValue] { implicit request =>
    Future.successful(if (limits.allowConnection(request)) {
      Right(ActorFlow.actorRef { out =>
        DatabaseSearchWebSocketActor.props(out, limits.getLimit(request), database, structures, motifs)
      })
    } else {
      Left(Forbidden)
    })
  }

}

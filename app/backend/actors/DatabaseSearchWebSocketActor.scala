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

package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.files.temporary.TemporaryFileProvider
import backend.server.database.Database
import backend.server.database.api.metadata.DatabaseMetadataResponse
import backend.server.database.api.suggestions.{DatabaseColumnSuggestionsRequest, DatabaseColumnSuggestionsResponse}
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}
import backend.server.limit.{IpLimit, RequestLimits}
import backend.server.motifs.Motifs
import backend.server.search.SearchTable
import backend.server.structures.Structures
import backend.server.search.api.export.{ExportDataRequest, ExportDataResponse}
import backend.server.search.api.paired.{PairedDataRequest, PairedDataResponse}
import backend.server.search.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.search.export.SearchTableConverter
import org.slf4j.LoggerFactory
import play.api.libs.json._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}


class DatabaseSearchWebSocketActor(out: ActorRef, limit: IpLimit, database: Database, structures: Structures, motifs: Motifs)
                                  (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, tfp: TemporaryFileProvider)
  extends WebSocketActor(out, limit) {
  private final val exportLogger = LoggerFactory.getLogger(this.getClass)
  private final val table: SearchTable = new SearchTable()

  def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
    out.getAction match {
      case DatabaseMetadataResponse.Action =>
        out.success(DatabaseMetadataResponse(database.getMetadata))
      case DatabaseColumnSuggestionsResponse.Action =>
        validateData(out, data, (suggestionsRequest: DatabaseColumnSuggestionsRequest) => {
          database.getSuggestions(suggestionsRequest.column) match {
            case Some(suggestions) => out.success(suggestions)
            case None => out.errorMessage(DatabaseSearchWebSocketActor.invalidSuggestionsRequestMessage)
          }
        })
      case SearchDataResponse.Action =>
        validateData(out, data, (searchRequest: SearchDataRequest) => {
          if (searchRequest.filters.nonEmpty) {
            val filters: DatabaseFilters = DatabaseFilters.createFromRequest(searchRequest.filters.get, database)
            filters.warnings.foreach((message: String) => {
              out.warningMessage(message)
            })
            table.update(filters, database, structures, motifs)
          }

          // The reconnect path sends the sort rule unconditionally, and a table that has just been
          // re-searched has none -- so ":none" arrives here routinely and must not throw.
          searchRequest.sort.map(_.split(":")).filter(_.length == 2).foreach { sorting =>
            table.sort(database.getMetadata.getColumnIndex(sorting(0)), sorting(1))
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
            pairedTable.update(pairedFilters, database, structures, motifs)

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
          // Every branch has to answer. `sendMessage` resolves on a frame with the same action and id
          // and *skips warnings*, so a warning-only failure -- and the unknown-format branch, which
          // used to reply with nothing at all -- left the export button spinning for good, and every
          // later attempt refused with "wait for the previous export to finish".
          val converter = SearchTableConverter.getConverter(exportRequest.format)
          if (converter.nonEmpty) {
            converter.get.convert(table, database, exportRequest.options) onComplete {
              case Success(link) =>
                out.success(ExportDataResponse(link.getDownloadLink))
              case Failure(t) =>
                exportLogger.error(s"Failed to export the search table as '${exportRequest.format}'", t)
                out.errorMessage(DatabaseSearchWebSocketActor.unableToExportRequestMessage)
            }
          } else {
            out.errorMessage(DatabaseSearchWebSocketActor.unknownExportFormatMessage)
          }
        })
      case _ =>
        out.errorMessage(DatabaseSearchWebSocketActor.invalidActionMessage)
    }
  }
}

object DatabaseSearchWebSocketActor {
  final val invalidSuggestionsRequestMessage: String = "Invalid suggestions request"
  final val unableToExportRequestMessage: String = "The table could not be exported. Please try again."
  final val unknownExportFormatMessage: String = "That export format is not supported."
  final val invalidActionMessage: String = "Invalid action"

  def props(out: ActorRef, limit: IpLimit, database: Database, structures: Structures, motifs: Motifs)
           (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, tfp: TemporaryFileProvider): Props =
    Props(new DatabaseSearchWebSocketActor(out, limit, database, structures, motifs))
}


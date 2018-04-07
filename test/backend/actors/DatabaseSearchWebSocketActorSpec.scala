/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

package backend.actors

import akka.actor.Props
import akka.testkit.TestProbe
import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.ResultsTable
import backend.server.database.Database
import backend.server.database.api.metadata.DatabaseMetadataResponse
import backend.server.database.api.suggestions.{DatabaseColumnSuggestionsRequest, DatabaseColumnSuggestionsResponse}
import backend.server.database.filters.{DatabaseFilterRequest, DatabaseFilterType, DatabaseFilters}
import backend.server.search.SearchTable
import backend.server.search.api.export.{ExportDataRequest, ExportDataResponse}
import backend.server.search.api.paired.{PairedDataRequest, PairedDataResponse}
import backend.server.search.api.search.{SearchDataRequest, SearchDataResponse}
import backend.server.search.export.SearchTableConverter
import org.scalatest.Succeeded
import play.api.libs.json.{JsValue, Json}
import scala.async.Async.{async, await}
import scala.language.reflectiveCalls

class DatabaseSearchWebSocketActorSpec extends ActorsTestSpec {
    lazy implicit val tfp: TemporaryFileProvider = app.injector.instanceOf[TemporaryFileProvider]
    lazy implicit val database: Database = app.injector.instanceOf[Database]
    lazy implicit val probe = TestProbe()
    lazy implicit val ws = system.actorOf(Props(new DatabaseSearchWebSocketActor(probe.ref, fakeLimit, database)))

    "DatabaseSearchWebSocketActor" should {
        "be able to handle invalid messages" taggedAs ActorsTestTag in {
            ws ! Json.obj()
            probe.expectMsg[JsValue](Json.toJson("Invalid request"))
            Succeeded
        }

        "be able to ping websocket" taggedAs ActorsTestTag in {
            ws ! createClientRequest(WebSocketOutActorRef.PingAction, None)
            expectHandshakeMessage(WebSocketOutActorRef.PingAction)
        }

        "be able to response with database metadata" taggedAs ActorsTestTag in {
            ws ! createClientRequest(DatabaseMetadataResponse.Action, None)
            val metadataResponse = expectSuccessMessageOfType[DatabaseMetadataResponse](DatabaseMetadataResponse.Action)
            metadataResponse.metadata shouldEqual database.getMetadata
        }

        "be able to response with database column suggestions" taggedAs ActorsTestTag in {
            database.getSuggestionsAvailableColumns.foreach((column) => {
                ws ! createClientRequest(DatabaseColumnSuggestionsResponse.Action, Some(DatabaseColumnSuggestionsRequest(column)))

                val suggestionsResponse = expectSuccessMessageOfType[DatabaseColumnSuggestionsResponse](DatabaseColumnSuggestionsResponse.Action)
                suggestionsResponse.suggestions shouldEqual database.getSuggestions(column).get.suggestions

                ws ! createClientRequest(DatabaseColumnSuggestionsResponse.Action, Some(DatabaseColumnSuggestionsRequest(column + "dummy_suffix")))
                val errorResponse = expectErrorMessage(DatabaseColumnSuggestionsResponse.Action)
                errorResponse shouldEqual DatabaseSearchWebSocketActor.invalidSuggestionsRequestMessage
            })

            Succeeded
        }

        "be able to search database" taggedAs ActorsTestTag in {
            val table: SearchTable = new SearchTable()
            val filters: List[DatabaseFilterRequest] = List(DatabaseFilterRequest("gene", DatabaseFilterType.Exact, negative = false, "TRA"))

            table.update(DatabaseFilters.createFromRequest(filters, database), database)

            ws ! createClientRequest(SearchDataResponse.Action, Some(SearchDataRequest(Some(filters), None, None, None, None, None)))
            val searchResponse = expectSuccessMessageOfType[SearchDataResponse](SearchDataResponse.Action)

            searchResponse.page shouldEqual 0
            searchResponse.pageSize shouldEqual ResultsTable.DEFAULT_PAGE_SIZE
            searchResponse.pageCount shouldEqual table.getPageCount
            searchResponse.recordsFound shouldEqual table.getRecordsFound
            searchResponse.rows shouldEqual table.getPage(0)

            ws ! createClientRequest(SearchDataResponse.Action, Some(SearchDataRequest(Some(filters), Some(2), Some(50), None, None, None)))
            val pagedSearchResponse = expectSuccessMessageOfType[SearchDataResponse](SearchDataResponse.Action)

            table.setPageSize(50)

            pagedSearchResponse.page shouldEqual 2
            pagedSearchResponse.pageSize shouldEqual 50
            pagedSearchResponse.pageCount shouldEqual table.getPageCount
            pagedSearchResponse.rows shouldEqual table.getPage(2)

            table.sort(database.getMetadata.getColumnIndex("gene"), "desc")

            ws ! createClientRequest(SearchDataResponse.Action, Some(SearchDataRequest(Some(filters), Some(2), Some(50), Some("gene:desc"), None, None)))
            val sortedSearchResponse = expectSuccessMessageOfType[SearchDataResponse](SearchDataResponse.Action)

            sortedSearchResponse.rows shouldEqual table.getPage(2)

            ws ! createClientRequest(SearchDataResponse.Action, Some(SearchDataRequest(Some(filters), None, None, None, None, Some(true))))
            expectHandshakeMessage(SearchDataResponse.Action)
        }

        "be able to response with paired records" taggedAs ActorsTestTag in {
            ws ! createClientRequest(PairedDataResponse.Action, Some(PairedDataRequest("0", "TRA")))
            val emptyPairedResponse = expectErrorMessageOfType[PairedDataResponse](PairedDataResponse.Action)

            emptyPairedResponse.paired should be(empty)
            emptyPairedResponse.found shouldEqual false

            ws ! createClientRequest(PairedDataResponse.Action, Some(PairedDataRequest("1", "TRA")))
            val pairedResponse = expectSuccessMessageOfType[PairedDataResponse](PairedDataResponse.Action)

            pairedResponse.paired should not be empty
            pairedResponse.paired.get.entries(database.getMetadata.getColumnIndex("gene")) shouldEqual "TRB"
            pairedResponse.paired.get.metadata.pairedID shouldEqual "1"
            pairedResponse.found shouldEqual true
        }

        "be able to response with export link" taggedAs ActorsTestTag in {
            SearchTableConverter.getAvailableConverters.map((converter) => async {
                ws ! createClientRequest(ExportDataResponse.Action, Some(ExportDataRequest(converter, Seq())))
                val exportResponse = expectSuccessMessageOfType[ExportDataResponse](ExportDataResponse.Action)
                exportResponse.link.length should be > 0

                val unpackedLink = TemporaryFileLink.unpackDownloadLink(exportResponse.link)

                val file = await(tfp.getWithMetadata(unpackedLink))
                file should not be empty
                file.get._2.checkIfExist shouldEqual true
                file.get._2.extension shouldEqual SearchTableConverter.getConverter(converter).get.getExtension

                val _ = await(tfp.deleteTemporaryFile(unpackedLink))
                Succeeded
            }).assertAll
        }

        "be able to handle invalid type of action" taggedAs ActorsTestTag in {
            ws ! createClientRequest("dummy_action", None)
            val invalidActionResponse = expectErrorMessage("dummy_action")
            invalidActionResponse shouldEqual DatabaseSearchWebSocketActor.invalidActionMessage
        }
    }
}

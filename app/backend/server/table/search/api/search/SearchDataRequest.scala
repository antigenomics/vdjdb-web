package backend.server.table.search.api.search

import backend.server.database.filters.DatabaseFilterRequest
import play.api.libs.json.{JsSuccess, JsValue, Reads}

case class SearchDataRequest(filters: Option[List[DatabaseFilterRequest]], page: Option[Int], pageSize: Option[Int], sort: Option[String], pairedID: Option[Int])

object SearchDataRequest {
    implicit val searchTableResultsDataRequestReads: Reads[SearchDataRequest] = (json: JsValue) =>
        JsSuccess(SearchDataRequest(
            (json \ "filters").asOpt[List[DatabaseFilterRequest]],
            (json \ "page").asOpt[Int],
            (json \ "pageSize").asOpt[Int],
            (json \ "sort").asOpt[String],
            (json \ "pairedID").asOpt[Int]))
}

package backend.server.api.search

import backend.server.filters.RequestFilter
import play.api.libs.json.{JsSuccess, JsValue, Reads}

case class SearchTableResultsDataRequest(filters: Option[List[RequestFilter]], page: Option[Int], pageSize: Option[Int])

object SearchTableResultsDataRequest {
    implicit val searchTableResultsDataRequestReads: Reads[SearchTableResultsDataRequest] = (json: JsValue) =>
        JsSuccess(SearchTableResultsDataRequest((json \ "filters").asOpt[List[RequestFilter]], (json \ "page").asOpt[Int], (json \ "pageSize").asOpt[Int]))
}

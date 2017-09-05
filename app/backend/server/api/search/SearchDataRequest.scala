package backend.server.api.search

import backend.server.filters.RequestFilter
import play.api.libs.json.{JsSuccess, JsValue, Reads}

case class SearchDataRequest(filters: Option[List[RequestFilter]], page: Option[Int], pageSize: Option[Int])

object SearchDataRequest {
    implicit val searchTableResultsDataRequestReads: Reads[SearchDataRequest] = (json: JsValue) =>
        JsSuccess(SearchDataRequest((json \ "filters").asOpt[List[RequestFilter]], (json \ "page").asOpt[Int], (json \ "pageSize").asOpt[Int]))
}

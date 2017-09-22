package backend.server.table.search.export

import backend.server.database.Database
import backend.server.table.search.SearchTable

trait SearchTableConverter {
    def convert(table: SearchTable, database: Database, folder: String): Option[String]
    def getName: String
    def getGuard: String
    def getHash: String
}

object SearchTableConverter {
    def getConverter(converterType: String): Option[SearchTableConverter] = {
        converterType match {
            case "tab-delimited-txt" => Some(SearchTableTabDelimitedConverter())
            case _ => None
        }
    }
}
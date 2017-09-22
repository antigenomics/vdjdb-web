package backend.server.table.search.export

import backend.server.database.Database
import backend.server.table.search.SearchTable
import backend.utils.files.TemporaryFile

trait SearchTableConverter {
    def convert(table: SearchTable, database: Database): Option[TemporaryFile]
}

object SearchTableConverter {
    def getConverter(converterType: String): Option[SearchTableConverter] = {
        converterType match {
            case "tab-delimited-txt" => Some(SearchTableTabDelimitedConverter())
            case _ => None
        }
    }
}
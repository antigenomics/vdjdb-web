package backend.server.table.search.export

import backend.server.database.Database
import backend.server.table.search.SearchTable
import backend.utils.files.{TemporaryFile, TemporaryFileLink}

case class SearchTableTabDelimitedConverter() extends SearchTableConverter {

    override def convert(table: SearchTable, database: Database): Option[TemporaryFileLink] = {
        val rows = table.getRows

        if (rows.nonEmpty) {
            val content = new StringBuilder()

            val header = database.getMetadata.columns.map(column => column.title).mkString("", "\t", "\r\n")
            content.append(header)

            rows.foreach(row => content.append(row.entries.map(entry => entry.value).mkString("", "\t", "\r\n")))

            Some(TemporaryFile.create("SearchTable.txt", content.toString()))
        } else {
            None
        }
    }
}

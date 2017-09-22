package backend.server.table.search.export

import java.io.{File, PrintWriter}
import java.text.SimpleDateFormat
import java.util.Date

import backend.server.database.Database
import backend.server.table.search.SearchTable
import backend.utils.{CommonUtils, FileUtils}

case class SearchTableTabDelimitedConverter() extends SearchTableConverter {
    private var name: String = ""
    private var guard: String = ""
    private var hash: String = ""

    override def convert(table: SearchTable, database: Database, folder: String): Option[String] = {
        val rows = table.getRows

        if (rows.nonEmpty) {
            val content = new StringBuilder()

            val header = database.getMetadata.columns.map(column => column.title).mkString("", "\t", "\r\n")
            content.append(header)

            rows.foreach(row => content.append(row.entries.map(entry => entry.value).mkString("", "\t", "\r\n")))

            val uniqueString = CommonUtils.randomAlphaString(20)
            val outputDirPath = folder + "/" + uniqueString + "/"

            FileUtils.createDirectory(outputDirPath)
            try {
                val dateFormat: SimpleDateFormat = new SimpleDateFormat("HH:mm-dd-MM-yyyy")
                val currentData: String = dateFormat.format(new Date())

                name = "SearchTable-" + currentData + ".txt"

                val printWriter = new PrintWriter(new File(outputDirPath + name))
                printWriter.write(content.toString())
                printWriter.close()

                hash = FileUtils.fileContentHash("MD5", outputDirPath + name) + currentData


                guard = CommonUtils.randomAlphaNumericString(50)
                val guardWriter = new PrintWriter(new File(outputDirPath + "." + guard))
                guardWriter.write(hash)
                guardWriter.close()

                Some(uniqueString)
            } catch {
                case _: Exception => None
            }
        } else {
            None
        }
    }

    override def getName: String = name

    override def getGuard: String = guard

    override def getHash: String = hash
}

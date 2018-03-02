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

package backend.server.annotations.export

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.annotations.{IntersectionTable, IntersectionTableRow}
import backend.server.database.Database
import backend.server.search.{SearchTable, SearchTableRow}
import backend.server.search.api.export.ExportOptionFlag

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}

case class IntersectionTableTSVConverter()(implicit tfp: TemporaryFileProvider, ec: ExecutionContext) extends IntersectionTableConverter {

    private def lift[T](futures: Seq[Future[T]]) = futures.map(_.map { Success(_) }.recover { case t => Failure(t) })
    private def waitAll[T](futures: Seq[Future[T]]) = Future.sequence(lift(futures))

    override def convert(sampleName: String, table: IntersectionTable, database: Database, options: Seq[ExportOptionFlag]): Future[TemporaryFileLink] = async {
        val rows = table.getRows

        val databaseHeader = database.getMetadata.columns.map(column => column.title).mkString("complex.id\t", "\t", "\r\n")

        val globalPaired: Map[String, SearchTableRow] = if (options.find((p) => p.name == "paired_export" && p.value == true).nonEmpty) {
            val matches = rows.map(_.matches.map(_.row)).flatten.toSet.toSeq
            val paired = SearchTable.getPairedRows(matches, database)
            paired.map((r) => r.metadata.pairedID -> r).toMap
        } else Map()

        val builders = rows.map((intersectionRow) => async {
            val rowContent = new StringBuilder()
            val meta = intersectionRow.metadata
            rowContent.append(IntersectionTableRow.getColumnNames.mkString("", "\t", "\tCDR3nt\tvEnd\tjStart\r\n"))
            rowContent.append(intersectionRow.entries.mkString("", "\t", s"\t${meta.cdr3nt}\t${meta.vEnd}\t${meta.jStart}\r\n"))
            rowContent.append("Matches\n")
            rowContent.append(databaseHeader)
            intersectionRow.matches.foreach((m) => {
                rowContent.append(m.row.entries.mkString(s"${m.row.metadata.pairedID}\t", "\t", "\r\n"))
            })

            options.foreach((option) => {
                option.name match {
                    case "paired_export" => {
                        if (option.value) {
                            val pairedIndices = intersectionRow.matches.map(_.row.metadata.pairedID).toSet.toSeq
                            val pairedRows = pairedIndices.map((pairedID) => globalPaired.get(pairedID)).filter(_.nonEmpty).map(_.get)
                            pairedRows.foreach((row) => rowContent.append(row.entries.mkString(s"${row.metadata.pairedID}\t", "\t", "\r\n")))
                        }
                    }
                    case _ =>
                }
            })

            rowContent.append("\r\n");
            rowContent
        })

        val completedBuilders = await(waitAll(builders)).filter(_.isSuccess)

        val content = new StringBuilder()
        completedBuilders.foreach((builder) => content.append(builder.get.toString()))

        await(tfp.createTemporaryFile(s"${sampleName}_AnnotationsTable", getExtension, content.toString()))
    }

    override def getExtension: String = "tsv"
}

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

        val globalPaired: Map[String, SearchTableRow] = if (options.exists(p => p.name == "paired_export" && p.value)) {
            val matches = rows.flatMap(_.matches.map(_.row)).distinct
            val paired = SearchTable.getPairedRows(matches, database)
            paired.map(r => r.metadata.pairedID -> r).toMap
        } else Map()

        val builders = rows.map(intersectionRow => async {
            val rowContent = new StringBuilder()
            val meta = intersectionRow.metadata

            intersectionRow.matches.foreach(m => {
                rowContent.append(intersectionRow.entries.mkString("", "\t", s"\t${meta.cdr3nt}\t${meta.vEnd}\t${meta.jStart}\t"))
                rowContent.append(m.row.entries.mkString(s"${m.row.metadata.pairedID}\t${m.matchScore}\t${m.weight}\t", "\t", "\r\n"))
            })

            options.foreach(option => {
                option.name match {
                    case "paired_export" =>
                        if (option.value) {
                            val pairedIndices = intersectionRow.matches.map(_.row.metadata.pairedID).distinct
                            val pairedRows = pairedIndices.map(pairedID => globalPaired.get(pairedID)).filter(_.nonEmpty).map(_.get)

                            pairedRows.foreach(row => {
                                rowContent.append(intersectionRow.entries.mkString("", "\t", s"\t${meta.cdr3nt}\t${meta.vEnd}\t${meta.jStart}\t"))
                                rowContent.append(row.entries.mkString(s"${row.metadata.pairedID}\tUndefined (paired)\tUndefined (paired)\t", "\t", "\r\n"))
                            })
                        }
                    case _ =>
                }
            })

            rowContent
        })

        val completedBuilders = await(waitAll(builders)).filter(_.isSuccess)

        val sampleHeader = IntersectionTableRow.getColumnNames.map(n => s"$n (Sample)").mkString("", "\t", "\tCDR3nt (Sample)\tvEnd (Sample)\tjStart (Sample)\t")
        val databaseHeader = database.getMetadata.columns.map(column => s"${column.title} (DB)").mkString("complex.id (DB)\tMatch Score\tWeight\t", "\t", "\r\n")

        val content = new StringBuilder()
        content.append(sampleHeader)
        content.append(databaseHeader)
        completedBuilders.foreach(builder => content.append(builder.get.toString()))

        await(tfp.createTemporaryFile(s"${sampleName}_AnnotationsTable", getExtension, content.toString()))
    }

    override def getExtension: String = "tsv"
}

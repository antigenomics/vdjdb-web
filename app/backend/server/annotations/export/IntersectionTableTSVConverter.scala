/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

package backend.server.annotations.export

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import backend.server.annotations.{IntersectionTable, IntersectionTableRow}
import backend.server.database.Database
import backend.server.search.api.export.ExportOptionFlag
import backend.server.search.{SearchTable, SearchTableRow}

import scala.concurrent.{ExecutionContext, Future}

case class IntersectionTableTSVConverter()(implicit tfp: TemporaryFileProvider, ec: ExecutionContext) extends IntersectionTableConverter {

  override def convert(sampleName: String, table: IntersectionTable, database: Database, options: Seq[ExportOptionFlag]): Future[TemporaryFileLink] = {
    // Rows are written straight into the file instead of into one StringBuilder per row that is then
    // joined into a single document: only the row being written is live now, which is what makes a large
    // annotations export survivable. The per-row Futures are gone with it, because they never awaited
    // anything: all they bought was the risk of dropping a row from the export when one of them failed.
    tfp.createTemporaryFileStreamed(s"${sampleName}_AnnotationsTable", getExtension) { content =>
      val rows = table.getRows

      val globalPaired: Map[String, SearchTableRow] = if (options.exists(p => p.name == "paired_export" && p.value)) {
        val matches = rows.flatMap(_.matches.map(_.row)).distinct
        val paired = SearchTable.getPairedRows(matches, database)
        paired.map(r => r.metadata.pairedID -> r).toMap
      } else Map()

      val sampleHeader = IntersectionTableRow.getColumnNames.map(n => s"$n (Sample)").mkString("", "\t", "\tCDR3nt (Sample)\tvEnd (Sample)\tjStart (Sample)\t")
      val databaseHeader = database.getMetadata.columns.map(column => s"${column.title} (DB)").mkString("complex.id (DB)\tMatch Score\tWeight\t", "\t", "\r\n")

      content.write(sampleHeader)
      content.write(databaseHeader)

      rows.foreach(intersectionRow => {
        val meta = intersectionRow.metadata

        intersectionRow.matches.foreach(m => {
          content.write(intersectionRow.entries.mkString("", "\t", s"\t${meta.cdr3nt}\t${meta.vEnd}\t${meta.jStart}\t"))
          content.write(m.row.entries.mkString(s"${m.row.metadata.pairedID}\t${m.matchScore}\t${m.weight}\t", "\t", "\r\n"))
        })

        options.foreach(option => {
          option.name match {
            case "paired_export" =>
              if (option.value) {
                val pairedIndices = intersectionRow.matches.map(_.row.metadata.pairedID).distinct
                val pairedRows = pairedIndices.map(pairedID => globalPaired.get(pairedID)).filter(_.nonEmpty).map(_.get)

                pairedRows.foreach(row => {
                  content.write(intersectionRow.entries.mkString("", "\t", s"\t${meta.cdr3nt}\t${meta.vEnd}\t${meta.jStart}\t"))
                  content.write(row.entries.mkString(s"${row.metadata.pairedID}\tUndefined (paired)\tUndefined (paired)\t", "\t", "\r\n"))
                })
              }
            case _ =>
          }
        })
      })
    }
  }

  override def getExtension: String = "tsv"
}

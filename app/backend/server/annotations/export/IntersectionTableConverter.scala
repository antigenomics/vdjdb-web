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
import backend.server.annotations.IntersectionTable
import backend.server.database.Database
import backend.server.search.api.export.ExportOptionFlag

import scala.concurrent.{ExecutionContext, Future}

trait IntersectionTableConverter {
    def convert(table: IntersectionTable, database: Database, options: Seq[ExportOptionFlag]): Future[TemporaryFileLink]
    def getExtension: String
}

object IntersectionTableConverter {
    def getConverter(converterType: String)(implicit tfp: TemporaryFileProvider, ec: ExecutionContext): Option[IntersectionTableConverter] = {
        converterType match {
            case "tsv" => Some(IntersectionTableTSVConverter())
            case _ => None
        }
    }
}

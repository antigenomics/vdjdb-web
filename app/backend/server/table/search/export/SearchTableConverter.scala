/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package backend.server.table.search.export

import backend.server.database.Database
import backend.server.table.search.SearchTable
import backend.utils.files.TemporaryFileLink

trait SearchTableConverter {
    def convert(table: SearchTable, database: Database): Option[TemporaryFileLink]
}

object SearchTableConverter {
    def getConverter(converterType: String): Option[SearchTableConverter] = {
        converterType match {
            case "tab-delimited-txt" => Some(SearchTableTabDelimitedConverter())
            case _ => None
        }
    }
}
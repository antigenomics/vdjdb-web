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

package backend.server.motifs.export

import backend.models.files.temporary.{TemporaryFileLink, TemporaryFileProvider}
import tech.tablesaw.api.Table

import scala.concurrent.Future

trait ClusterMembersConverter {
  def convert(members: Table, cid: String): Future[TemporaryFileLink]

  def getExtension: String
}

object ClusterMembersConverter {
  def getAvailableConverters: Seq[String] = Seq("tsv")

  def getConverter(converterType: String)(implicit tfp: TemporaryFileProvider): Option[ClusterMembersConverter] = {
    converterType match {
      case "tsv" => Some(ClusterMembersTSVConverter())
      case _ => None
    }
  }
}

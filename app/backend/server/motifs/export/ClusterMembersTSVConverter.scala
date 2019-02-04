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

case class ClusterMembersTSVConverter()(implicit tfp: TemporaryFileProvider) extends ClusterMembersConverter {
  override def convert(members: Table, cid: String): Future[TemporaryFileLink] = {
    val content = new StringBuilder()

    val columnNames = members.columnArray().map(_.name())
    val header = columnNames.mkString("", "\t", "\r\n")

    content.append(header)

    members.doWithRows(row => {
      content.append(columnNames.map(n => row.getString(n)).mkString("", "\t", "\r\n"))
    })

    tfp.createTemporaryFile(s"ClusterMembers_$cid", getExtension, content.toString())
  }

  override def getExtension: String = "tsv"
}

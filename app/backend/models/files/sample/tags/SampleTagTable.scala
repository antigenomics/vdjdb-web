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

package backend.models.files.sample.tags

import backend.models.authorization.user.UserProvider
import backend.models.files.FileMetadataProvider
import slick.jdbc.H2Profile.api._
import slick.lifted.Tag

import scala.language.higherKinds
import scala.util.matching.Regex

class SampleTagTable(tag: Tag) extends Table[SampleTag](tag, SampleTagTable.TABLE_NAME){
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def name = column[String]("TAG_NAME", O.Length(64))
    def color = column[String]("TAG_COLOR", O.Length(32))
    def userID = column[Long]("USER_ID")

    def * = (id, name, color, userID) <> (SampleTag.tupled, SampleTag.unapply)
}

object SampleTagTable {
    final val TABLE_NAME = "SAMPLE_TAG"

    implicit class SampleTagExtension[C[_]](q: Query[SampleTagTable, SampleTag, C]) {
        def withUser(implicit up: UserProvider) = q.join(up.getTable).on(_.userID === _.id)
    }

    private final val namePattern: Regex = new Regex("^[a-zA-Z0-9_.+-]{1,40}$")
    private final val colorPattern: Regex = new Regex("^rgb\\([0-9]{1,3},[0-9]{1,3},[0-9]{1,3}\\)$")

    def isNameValid(name: String): Boolean = {
        namePattern.pattern.matcher(name).matches
    }

    def isColorValid(color: String): Boolean = {
        colorPattern.pattern.matcher(color).matches
    }
}

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

package backend.models.files.sample

import backend.models.authorization.user.{User, UserProvider}
import backend.models.files.sample.tags.SampleTagProvider
import backend.models.files.{FileMetadata, FileMetadataProvider}

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}

/** @param species sample species, or `""` for rows uploaded before species was recorded
  * @param chain   `TRA`/`TRB`, or `""` when unknown. A file containing both is split into two samples
  *                at upload, so a stored sample is always single-chain.
  */
case class SampleFile(id: Long, sampleName: String, software: String, readsCount: Long, clonotypesCount: Long,
                      metadataID: Long, userID: Long, tagID: Long, species: String, chain: String,
                      sourceSoftware: String) {

  /** What to show the user as "the format of this sample".
    *
    * `software` is the format the file is stored in, which every upload normalises to VDJtools, so on
    * its own it tells the user nothing about what they gave us. Prefer the recorded source dialect and
    * fall back to the stored one for samples that predate it. */
  def displaySoftware: String = if (sourceSoftware.nonEmpty) sourceSoftware else software
  def getMetadata(implicit fmp: FileMetadataProvider, ec: ExecutionContext): Future[FileMetadata] = {
    fmp.get(metadataID).map(_.get)
  }

  def getUser(implicit up: UserProvider, ec: ExecutionContext): Future[User] = {
    up.get(userID).map(_.get)
  }

  def getDetails: SampleFileDetails = {
    SampleFileDetails(sampleName, displaySoftware, readsCount, clonotypesCount, tagID, species, chain)
  }

  def isSampleFileInfoEmpty: Boolean = readsCount == -1 || clonotypesCount == -1

  def updateSampleFileInfo(readsCount: Long, clonotypesCount: Long)(implicit sfp: SampleFileProvider): Future[Int] = {
    sfp.updateSampleFileInfo(this, readsCount, clonotypesCount)
  }

  def updateSampleFileProps(newSampleName: String, newSoftware: String, newTagID: Long)
                           (implicit sfp: SampleFileProvider, stp: SampleTagProvider, up: UserProvider, ec: ExecutionContext): Future[Int] = async {
    val files = await(this.getUser.flatMap(_.getSampleFiles))
    val duplicate = files.filter(_ != this).find(_.sampleName == newSampleName)
    if (duplicate.nonEmpty) {
      await(Future.failed[Int](new Exception("Duplicate found")))
    } else {
      val tag = await(stp.getByIdAndUser(newTagID, await(this.getUser)))
      await(sfp.updateSampleFileProps(this, newSampleName, newSoftware, if (tag.nonEmpty) newTagID else -1))
    }
  }

  def updateSampleFileTagID(tagID: Long)(implicit sfp: SampleFileProvider): Future[Int] = {
    sfp.updateSampleFileTagID(this, tagID)
  }
}

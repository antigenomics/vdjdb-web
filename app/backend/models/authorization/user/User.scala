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

package backend.models.authorization.user

import java.io.File

import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.files.sample.tags.{SampleTag, SampleTagProvider}
import backend.models.files.sample.{SampleFile, SampleFileProvider}
import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.utils.CommonUtils
import backend.utils.files.FileUtils
import org.mindrot.jbcrypt.BCrypt
import play.api.libs.Files

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}

case class User(id: Long, login: String, email: String, verified: Boolean, folderPath: String,
                private[authorization] val password: String, private[authorization] val permissionID: Long) {
  def getPermissions(implicit upp: UserPermissionsProvider, ec: ExecutionContext): Future[UserPermissions] = {
    upp.getByID(permissionID).map(_.get)
  }

  def getSampleFiles(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[Seq[SampleFile]] = {
    sfp.getByUserID(id)
  }

  def getTaggedSampleFiles(tagID: Long)(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[Seq[SampleFile]] = {
    sfp.getByUserAndTagID(this, tagID)
  }

  def getSampleTags(implicit stp: SampleTagProvider, ec: ExecutionContext): Future[Seq[SampleTag]] = {
    stp.getByUserID(id)
  }

  def getSampleFileByName(name: String)(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[Option[SampleFile]] = {
    sfp.getByUserIDAndName(id, name)
  }

  def getSampleFileByNameWithMetadata(name: String)(implicit sfp: SampleFileProvider,
                                                    fmp: FileMetadataProvider,
                                                    ec: ExecutionContext): Future[Option[(SampleFile, FileMetadata)]] = {
    sfp.getByUserIDAndNameWithMetadata(id, name)
  }

  def getSampleFilesWithMetadata(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[Seq[(SampleFile, FileMetadata)]] = {
    sfp.getByUserIDWithMetadata(id)
  }

  def getDetails(implicit upp: UserPermissionsProvider, sfp: SampleFileProvider, stp: SampleTagProvider, ec: ExecutionContext): Future[UserDetails] = async {
    val permissions = getPermissions
    val fileDetails = getSampleFiles.map(_.map(_.getDetails))
    val tagsDetails = getSampleTags.map(_.map(_.getDetails))
    UserDetails(email, login, await(fileDetails), await(tagsDetails), await(permissions))
  }

  def addSampleFile(name: String, extension: String, softwareType: String, file: Files.TemporaryFile)
                   (implicit sfp: SampleFileProvider, upp: UserPermissionsProvider, fmp: FileMetadataProvider,
                    ec: ExecutionContext): Future[Either[Long, String]] = async {
    val files = await(getSampleFiles)
    if (files.exists(_.sampleName == name)) {
      Right(s"Sample file $name already exist")
    } else {
      val permissions = await(getPermissions)
      if (!permissions.isUploadAllowed) {
        Right("Upload is not allowed for this account")
      } else {
        if (permissions.maxFilesCount >= 0 && permissions.maxFilesCount <= files.length) {
          Right("Max files count limit have been exceeded")
        } else {
          if (permissions.getMaxFileSizeInBytes >= 0 && permissions.getMaxFileSizeInBytes <= file.getAbsoluteFile.length()) {
            Right("Max file size limit have been exceeded")
          } else {
            val sampleFolderPath = s"$folderPath/${CommonUtils.randomAlphaString(8)}-$name"
            val sampleFolder = new File(sampleFolderPath)
            val success = sampleFolder.mkdirs()
            if (success) {
              val metadataID = await(fmp.insert(name, extension, sampleFolderPath))
              FileUtils.copyFile(file.path.toString, s"$sampleFolderPath/$name.$extension")
              file.deleteOnExit()
              val sampleFileID = await(sfp.insert(SampleFile(0, name, softwareType, -1, -1, metadataID, id, -1)))
              Left(sampleFileID)
            } else {
              Right("Unable to create sample file (internal server error)")
            }
          }
        }
      }
    }
  }

  def addDemoSampleFile(name: String, extension: String, softwareType: String, file: File)
                       (implicit sfp: SampleFileProvider, upp: UserPermissionsProvider, fmp: FileMetadataProvider,
                        ec: ExecutionContext): Future[Either[Long, String]] = async {
    val permissions = await(getPermissions)
    if (permissions.isUploadAllowed) {
      Right("Unable to create demo sample file, it is not a demo account")
    } else {
      val files = await(getSampleFiles)
      if (files.exists(_.sampleName == name)) {
        Right(s"Sample file $name already exist")
      } else {
        if (!file.isFile || !file.getParentFile.isDirectory) {
          Right(s"Bad file $name")
        } else {
          val sampleFolderPath = file.getParentFile.getAbsolutePath
          val sampleFolder = file.getParentFile
          val metadataID = await(fmp.insert(name, extension, sampleFolderPath))
          val sampleFileID = await(sfp.insert(SampleFile(0, name, softwareType, -1, -1, metadataID, id, -1)))
          Left(sampleFileID)
        }
      }
    }
  }

  def checkPassword(plain: String): Boolean = {
    BCrypt.checkpw(plain, password)
  }

  private[authorization] def delete(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[AnyVal] = async {
    val samples = await(getSampleFiles)
    samples.foreach { sample => sfp.delete(sample) }
    val folder = new File(folderPath)
    if (folder.exists()) {
      folder.delete()
    }
  }
}




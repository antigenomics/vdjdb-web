/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.models.authorization.user

import java.io.File
import java.nio.file.Paths

import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.models.files.sample.{SampleFile, SampleFileProvider}
import backend.utils.CommonUtils
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

    def getSampleFileByName(name: String)(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[Option[SampleFile]] = {
        sfp.getByUserIDAndName(id, name)
    }

    def getSampleFilesWithMetadata(implicit sfp: SampleFileProvider, ec: ExecutionContext): Future[Seq[(SampleFile, FileMetadata)]] = {
        sfp.getByUserIDWithMetadata(id)
    }

    def getDetails(implicit upp: UserPermissionsProvider, sfp: SampleFileProvider, ec: ExecutionContext): Future[UserDetails] = async {
        val permissions = getPermissions
        val files = getSampleFiles
        UserDetails(email, login, await(files).map(_.sampleName), await(permissions))
    }

    def addSampleFile(name: String, extension: String, file: Files.TemporaryFile)
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
                    Right("You have exceeded files count limit")
                } else {
                    if (permissions.getMaxFileSizeInBytes >= 0 && permissions.getMaxFileSizeInBytes <= file.getAbsoluteFile.length()) {
                        Right("You have exceeded file size limit")
                    } else {
                        val sampleFolderPath = s"$folderPath/${CommonUtils.randomAlphaString(8)}-$name"
                        val sampleFolder = new File(sampleFolderPath)
                        val success = sampleFolder.mkdirs()
                        if (success) {
                            val metadataID = await(fmp.insert(name, extension, sampleFolderPath))
                            file.moveTo(Paths.get(s"$sampleFolderPath/$name.$extension"), replace = true)
                            val sampleFileID = await(sfp.insert(SampleFile(0, name, metadataID, id)))
                            Left(sampleFileID)
                        } else {
                            Right("Unable to create sample file (internal server error)")
                        }
                    }
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




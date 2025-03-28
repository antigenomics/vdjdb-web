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

package backend.models.authorization.user

import java.io.File
import java.nio.file.Paths

import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.tokens.verification.VerificationTokenProvider
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.SampleFileProvider
import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}
import backend.utils.TimeUtils
import play.api.libs.Files

import scala.async.Async.{async, await}

class UserProviderSpec extends DatabaseProviderTestSpec {
  implicit lazy val userProvider: UserProvider                       = app.injector.instanceOf[UserProvider]
  implicit lazy val tokenProvider: VerificationTokenProvider         = app.injector.instanceOf[VerificationTokenProvider]
  implicit lazy val userPermissionsProvider: UserPermissionsProvider = app.injector.instanceOf[UserPermissionsProvider]
  implicit lazy val fileMetadataProvider: FileMetadataProvider       = app.injector.instanceOf[FileMetadataProvider]
  implicit lazy val sampleFileProvider: SampleFileProvider           = app.injector.instanceOf[SampleFileProvider]

  "UserProvider" should {

    "have proper table name" taggedAs SQLDatabaseTestTag in {
      userProvider.getTable.baseTableRow.tableName shouldEqual UserTable.TABLE_NAME
    }

    "be able to create not-verified user" taggedAs SQLDatabaseTestTag in {
      async {
        val token = await(userProvider.createUser("unverified", "unverified@mail.com", "password"))
        val user  = await(userProvider.get(token.userID))
        user should not be empty

        user.get.login shouldEqual "unverified"
        user.get.email shouldEqual "unverified@mail.com"
        user.get.verified shouldEqual false
        user.get.password shouldNot equal("password")
        user.get.permissionID shouldEqual UserPermissionsProvider.DEFAULT_ID
        user.get.createIP shouldEqual "none"
        user.get.isTemporary shouldEqual false

        val verificationToken = await(tokenProvider.get(token.token))
        verificationToken should not be empty
        verificationToken.get.token shouldEqual token.token
      }
    }

    "be able to create temporary user" taggedAs SQLDatabaseTestTag in {
      async {
        val user = await(userProvider.createTemporaryUser("random-token", "some-ip"))

        user should not be empty

        user.get.login shouldEqual "random-token"
        user.get.email shouldEqual "random-token"
        user.get.verified shouldEqual true
        user.get.permissionID shouldEqual UserPermissionsProvider.TEMPORARY_ID
        user.get.createIP shouldEqual "some-ip"
        user.get.isTemporary shouldEqual true
      }
    }

    "not be able to create user with the same email" taggedAs SQLDatabaseTestTag in {
      async {
        val _ = await(userProvider.createUser("alreadycreated", "alreadycreated@mail.com", "password"))
        val exception = await(recoverToExceptionIf[Exception] {
          userProvider.createUser("alreadycreated", "alreadycreated@mail.com", "password")
        })
        exception should have message "User already exists"
      }
    }

    "be able to verify user" taggedAs SQLDatabaseTestTag in {
      async {
        val tokens = await(tokenProvider.getAll)
        val token  = tokens.head
        val user   = await(userProvider.get(token.userID))
        user should not be empty

        val verifiedUser = await(userProvider.verifyUser(token.token))
        verifiedUser should not be empty

        verifiedUser.get.login shouldEqual user.get.login
        verifiedUser.get.email shouldEqual user.get.email
        verifiedUser.get.id shouldEqual user.get.id
        verifiedUser.get.id shouldEqual token.userID
        verifiedUser.get.verified shouldEqual true

        val deleteToken = await(tokenProvider.get(token.token))
        deleteToken shouldBe empty
      }
    }

    "be able to create users with the same login" taggedAs SQLDatabaseTestTag in {
      async {
        val token1 = await(userProvider.createUser("onelogin", "testlogin1@mail.com", "password"))
        val token2 = await(userProvider.createUser("onelogin", "testlogin2@mail.com", "password"))

        val user1 = await(userProvider.get(token1.userID))
        val user2 = await(userProvider.get(token2.userID))

        user1 should not be empty
        user2 should not be empty

        user1.get.login shouldEqual "onelogin"
        user1.get.login shouldEqual user2.get.login
      }
    }

    "be able to delete non-verified users and associated tokens" taggedAs SQLDatabaseTestTag in {
      async {
        val fakeExpiredAt = TimeUtils.getExpiredAt(-1)
        val token1        = await(userProvider.createUser("user1", "user1@mail.ru", "user1password", UserPermissionsProvider.DEFAULT_ID, fakeExpiredAt))
        val token2        = await(userProvider.createUser("user2", "user2@mail.ru", "user2password", UserPermissionsProvider.DEFAULT_ID, fakeExpiredAt))

        val deleted = await(userProvider.deleteUnverified)
        deleted shouldEqual 2

        val token1Check = tokenProvider.get(token1.token)
        val token2Check = tokenProvider.get(token2.token)
        val user1Check  = userProvider.get(token1.userID)
        val user2Check  = userProvider.get(token2.userID)

        await(token1Check) shouldBe empty
        await(token2Check) shouldBe empty
        await(user1Check) shouldBe empty
        await(user2Check) shouldBe empty
      }
    }

    "be able to delete all sample files when deleting user" taggedAs SQLDatabaseTestTag in {
      async {
        val token = await(userProvider.createUser("user1", "user3@mail.ru", "user3password"))
        val user  = await(userProvider.verifyUser(token))
        user should not be empty

        val file = new File("/tmp/dummy.txt")
        file.createNewFile()
        val tmpFile      = Files.SingletonTemporaryFileCreator.create(Paths.get(file.getPath))
        val sampleFileID = await(user.get.addSampleFile("sample", "txt", "vdjtools", tmpFile))
        sampleFileID should be('left)
        sampleFileID.left.get shouldNot equal(0)

        val sample = await(sampleFileProvider.get(sampleFileID.left.get))
        sample should not be empty
        sample.get.userID shouldEqual user.get.id
        sample.get.sampleName shouldEqual "sample"

        val sampleMetadata = await(fileMetadataProvider.get(sample.get.metadataID))
        sampleMetadata should not be empty
        sampleMetadata.get.extension shouldEqual "txt"

        await(userProvider.delete(user.get) flatMap { success =>
          success shouldEqual 1
          async {
            val deletedSample = await(sampleFileProvider.get(sampleFileID.left.get))
            deletedSample shouldBe empty

            val deletedUser = await(userProvider.get(user.get.id))
            deletedUser shouldBe empty

            val deletedSampleMetadata = await(fileMetadataProvider.get(sample.get.metadataID))
            deletedSampleMetadata shouldBe empty

            val deletedSampleFile = new File(sampleMetadata.get.path)
            deletedSampleFile shouldNot exist

            val deletedSampleFolder = new File(sampleMetadata.get.folder)
            deletedSampleFolder shouldNot exist

            succeed
          }
        })
      }
    }
  }

}

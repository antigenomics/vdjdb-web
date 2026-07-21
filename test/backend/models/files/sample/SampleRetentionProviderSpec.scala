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

package backend.models.files.sample

import java.io.File
import java.sql.Timestamp

import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.{User, UserProvider}
import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.models.{DatabaseProviderTestSpec, SQLDatabaseTestTag}

import scala.async.Async.{async, await}
import scala.concurrent.Future

class SampleRetentionProviderSpec extends DatabaseProviderTestSpec {
  implicit lazy val userPermissionsProvider: UserPermissionsProvider = app.injector.instanceOf[UserPermissionsProvider]
  implicit lazy val fileMetadataProvider: FileMetadataProvider       = app.injector.instanceOf[FileMetadataProvider]
  implicit lazy val sampleFileProvider: SampleFileProvider           = app.injector.instanceOf[SampleFileProvider]
  implicit lazy val userProvider: UserProvider                       = app.injector.instanceOf[UserProvider]
  lazy val retentionProvider: SampleRetentionProvider                = app.injector.instanceOf[SampleRetentionProvider]

  private final val Day: Long = 24L * 60L * 60L

  /** The shipped windows, so the tests exercise the numbers that will actually be deployed. */
  private def policy(dryRun: Boolean): SampleRetentionConfiguration = SampleRetentionConfiguration(
    enabled = true,
    dryRun = dryRun,
    intervalSeconds = 0L,
    keepRegisteredSeconds = 365L * Day,
    keepTemporarySeconds = 7L * Day
  )

  private def mkdirs(dir: File): Unit = { val _ = dir.mkdirs() }

  private def create(file: File): Unit = { val _ = file.createNewFile() }

  /** Stores a sample for `user` whose FILE_METADATA.CREATED_AT is `ageDays` in the past. Written
    * straight through the providers rather than through `User.addSampleFile`, which always stamps
    * CREATED_AT with "now" and so cannot express an aged row. */
  private def storeSample(user: User, name: String, ageDays: Long): Future[(Long, FileMetadata)] = async {
    val folder = new File(s"${user.folderPath}/$name")
    val file   = new File(s"${folder.getPath}/$name.txt")
    mkdirs(folder)
    create(file)

    val createdAt  = new Timestamp(System.currentTimeMillis() - ageDays * Day * 1000L)
    val metadataID = await(fileMetadataProvider.insert(FileMetadata(0, name, "txt", file.getPath, folder.getPath, createdAt)))
    val sampleID   = await(sampleFileProvider.insert(
      SampleFile(0, name, "VDJtools", -1L, -1L, metadataID, user.id, -1L, "HomoSapiens", "TRB")))
    val metadata = await(fileMetadataProvider.get(metadataID))
    (sampleID, metadata.get)
  }

  private def registeredUser(email: String, permissionsID: Long = UserPermissionsProvider.DEFAULT_ID): Future[User] = async {
    val token = await(userProvider.createUser(email, email, "password", permissionsID))
    await(userProvider.verifyUser(token)).get
  }

  "SampleRetentionConfiguration" should {

    "fall back to the documented defaults when the keys are absent" taggedAs SQLDatabaseTestTag in {
      // Production replaces application.conf wholesale, so a key added here is missing there until
      // someone edits the server-side file. Missing must mean "default", never "crash on boot".
      val empty = play.api.Configuration(com.typesafe.config.ConfigFactory.parseString(""))
      val configuration = SampleRetentionConfiguration.fromConfig(empty)

      configuration.enabled shouldEqual true
      configuration.dryRun shouldEqual true
      configuration.intervalSeconds shouldEqual 24L * 60L * 60L
      configuration.keepRegisteredSeconds shouldEqual 365L * Day
      configuration.keepTemporarySeconds shouldEqual 7L * Day
    }

    "ship with dry-run enabled" taggedAs SQLDatabaseTestTag in {
      // Non-negotiable: the first contact this sweeper has with real data must not be able to
      // destroy it. Flipping this default is a deliberate, separate act.
      retentionProvider.getConfiguration.dryRun shouldEqual true
    }
  }

  "SampleRetentionProvider" should {

    "delete nothing in dry-run mode" taggedAs SQLDatabaseTestTag in {
      async {
        val user             = await(registeredUser("retention-dryrun@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "dryrun", ageDays = 400L))

        val result = await(retentionProvider.sweep(policy(dryRun = true)))

        result.expired should be >= 1
        result.deleted shouldEqual 0

        await(sampleFileProvider.get(sampleID)) should not be empty
        new File(meta.path) should exist
        new File(meta.folder) should exist
      }
    }

    "delete a registered account's samples once they are past the 365 day window" taggedAs SQLDatabaseTestTag in {
      async {
        val user             = await(registeredUser("retention-old@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "ancient", ageDays = 400L))

        val result = await(retentionProvider.sweep(policy(dryRun = false)))
        result.deleted should be >= 1

        // Both halves: the rows, and the files. Deleting one without the other is what leaves either
        // orphaned directories on disk or rows pointing at nothing.
        await(sampleFileProvider.get(sampleID)) shouldBe empty
        await(fileMetadataProvider.get(meta.id)) shouldBe empty
        new File(meta.path) shouldNot exist
        new File(meta.folder) shouldNot exist
      }
    }

    "keep a registered account's samples that are inside the window" taggedAs SQLDatabaseTestTag in {
      async {
        val user             = await(registeredUser("retention-recent@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "recent", ageDays = 100L))

        val _ = await(retentionProvider.sweep(policy(dryRun = false)))

        await(sampleFileProvider.get(sampleID)) should not be empty
        new File(meta.path) should exist
      }
    }

    "use the 7 day window for temporary accounts" taggedAs SQLDatabaseTestTag in {
      async {
        val user = await(userProvider.createTemporaryUser("retention-token-user", "10.0.0.1")).get

        // 10 days is inside the 365 day registered window and outside the 7 day temporary one, so
        // this fails if the sweeper picks the window by anything other than the account type.
        val (expiredID, expiredMeta) = await(storeSample(user, "tokenold", ageDays = 10L))
        val (freshID, freshMeta)     = await(storeSample(user, "tokennew", ageDays = 3L))

        val _ = await(retentionProvider.sweep(policy(dryRun = false)))

        await(sampleFileProvider.get(expiredID)) shouldBe empty
        new File(expiredMeta.folder) shouldNot exist

        await(sampleFileProvider.get(freshID)) should not be empty
        new File(freshMeta.path) should exist
      }
    }

    "never touch DEMO or UNLIMITED accounts" taggedAs SQLDatabaseTestTag in {
      async {
        val demoUser      = await(registeredUser("retention-demo@mail.com", UserPermissionsProvider.DEMO_ID))
        val unlimitedUser = await(registeredUser("retention-admin@mail.com", UserPermissionsProvider.UNLIMITED_ID))

        val (demoSampleID, demoMeta)           = await(storeSample(demoUser, "demoancient", ageDays = 4000L))
        val (unlimitedSampleID, unlimitedMeta) = await(storeSample(unlimitedUser, "adminancient", ageDays = 4000L))

        val _ = await(retentionProvider.sweep(policy(dryRun = false)))

        await(sampleFileProvider.get(demoSampleID)) should not be empty
        new File(demoMeta.path) should exist

        await(sampleFileProvider.get(unlimitedSampleID)) should not be empty
        new File(unlimitedMeta.path) should exist
      }
    }
  }
}

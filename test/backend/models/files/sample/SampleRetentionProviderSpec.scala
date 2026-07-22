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

  private final val Day: Long  = 24L * 60L * 60L
  private final val Hour: Long = 60L * 60L

  /** The shipped windows, so the tests exercise the numbers that will actually be deployed. */
  private def policy(dryRun: Boolean, epochMillis: Long = 0L): SampleRetentionConfiguration = SampleRetentionConfiguration(
    enabled = true,
    dryRun = dryRun,
    intervalSeconds = 0L,
    keepRegisteredSeconds = 180L * Day,
    keepTemporarySeconds = 3L * Hour,
    epochMillis = epochMillis
  )

  private def mkdirs(dir: File): Unit = { val _ = dir.mkdirs() }

  private def create(file: File): Unit = { val _ = file.createNewFile() }

  /** Stores a sample for `user` whose FILE_METADATA.CREATED_AT is `ageSeconds` in the past. Written
    * straight through the providers rather than through `User.addSampleFile`, which always stamps
    * CREATED_AT with "now" and so cannot express an aged row.
    *
    * In seconds rather than days because the token window is now three hours, and a helper that can
    * only express whole days cannot place a sample inside it. */
  private def storeSample(user: User, name: String, ageSeconds: Long): Future[(Long, FileMetadata)] = async {
    val folder = new File(s"${user.folderPath}/$name")
    val file   = new File(s"${folder.getPath}/$name.txt")
    mkdirs(folder)
    create(file)

    val createdAt  = new Timestamp(System.currentTimeMillis() - ageSeconds * 1000L)
    val metadataID = await(fileMetadataProvider.insert(FileMetadata(0, name, "txt", file.getPath, folder.getPath, createdAt)))
    val sampleID   = await(sampleFileProvider.insert(
      SampleFile(0, name, "VDJtools", -1L, -1L, metadataID, user.id, -1L, "HomoSapiens", "TRB", "VDJtools")))
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
      configuration.intervalSeconds shouldEqual 30L * 60L
      configuration.keepRegisteredSeconds shouldEqual 180L * Day
      configuration.keepTemporarySeconds shouldEqual 3L * Hour
      configuration.epochMillis shouldEqual 0L
    }

    "print a window at the scale it was configured in" taggedAs SQLDatabaseTestTag in {
      // "0d" for the three-hour token window would read as a misconfigured zero in the sweep log.
      SampleRetentionConfiguration.window(180L * Day) shouldEqual "180d"
      SampleRetentionConfiguration.window(3L * Hour) shouldEqual "3h"
      SampleRetentionConfiguration.window(30L * 60L) shouldEqual "30m"
      SampleRetentionConfiguration.window(45L) shouldEqual "45s"
    }

    "read ageFrom as an ISO-8601 instant, and ignore one it cannot parse" taggedAs SQLDatabaseTestTag in {
      val parsed = SampleRetentionConfiguration.fromConfig(play.api.Configuration(
        com.typesafe.config.ConfigFactory.parseString(
          s"""${SampleRetentionConfiguration.Root}.ageFrom = "2026-07-21T00:00:00Z"""")))
      parsed.epochMillis shouldEqual java.time.Instant.parse("2026-07-21T00:00:00Z").toEpochMilli

      // Unparseable must mean "no floor", not an exception: this is read while Guice builds the
      // object graph, so throwing here crash-loops the application on boot.
      val junk = SampleRetentionConfiguration.fromConfig(play.api.Configuration(
        com.typesafe.config.ConfigFactory.parseString(
          s"""${SampleRetentionConfiguration.Root}.ageFrom = "last tuesday"""")))
      junk.epochMillis shouldEqual 0L
    }

    "age a sample from the floor when the floor is later than its own timestamp" taggedAs SQLDatabaseTestTag in {
      val floor   = 1000L * 60L * 60L * 24L * 100L
      val old     = 1000L
      val withOut = policy(dryRun = true)
      val withIn  = policy(dryRun = true, epochMillis = floor)

      withOut.effectiveCreatedAt(old) shouldEqual old
      withIn.effectiveCreatedAt(old) shouldEqual floor
      // A sample newer than the floor keeps its own timestamp - the floor only ever raises.
      withIn.effectiveCreatedAt(floor + 5000L) shouldEqual floor + 5000L
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
        val (sampleID, meta) = await(storeSample(user, "dryrun", ageSeconds = 400L * Day))

        val result = await(retentionProvider.sweep(policy(dryRun = true)))

        result.expired should be >= 1
        result.deleted shouldEqual 0

        await(sampleFileProvider.get(sampleID)) should not be empty
        new File(meta.path) should exist
        new File(meta.folder) should exist
      }
    }

    "delete a registered account's samples once they are past the 180 day window" taggedAs SQLDatabaseTestTag in {
      async {
        val user             = await(registeredUser("retention-old@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "ancient", ageSeconds = 400L * Day))

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

    "spare a sample that is past its window but predates the ageFrom floor" taggedAs SQLDatabaseTestTag in {
      // The case this whole feature exists for. Measured on production, 1,375 of 1,443 registered
      // samples are older than 365 days - the oldest by eight years - so switching the sweeper on
      // without a floor is a near-total wipe on the first pass rather than housekeeping.
      async {
        val user             = await(registeredUser("retention-floored@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "ancient-but-floored", ageSeconds = 3000L * Day))

        val floor  = System.currentTimeMillis - 10L * 24L * 60L * 60L * 1000L
        val result = await(retentionProvider.sweep(policy(dryRun = false, epochMillis = floor)))

        result.expired shouldEqual 0
        await(sampleFileProvider.get(sampleID)) should not be empty
        new File(meta.path) should exist
      }
    }

    "still delete a floored sample once the floor itself is past the window" taggedAs SQLDatabaseTestTag in {
      // The floor delays ageing, it does not exempt. Otherwise setting it once would disable
      // retention permanently and quietly.
      async {
        val user             = await(registeredUser("retention-floor-elapsed@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "floor-elapsed", ageSeconds = 3000L * Day))

        val floor  = System.currentTimeMillis - 400L * 24L * 60L * 60L * 1000L
        val result = await(retentionProvider.sweep(policy(dryRun = false, epochMillis = floor)))

        result.deleted should be >= 1
        await(sampleFileProvider.get(sampleID)) shouldBe empty
        new File(meta.path) shouldNot exist
      }
    }

    "keep a registered account's samples that are inside the window" taggedAs SQLDatabaseTestTag in {
      async {
        val user             = await(registeredUser("retention-recent@mail.com"))
        val (sampleID, meta) = await(storeSample(user, "recent", ageSeconds = 100L * Day))

        val _ = await(retentionProvider.sweep(policy(dryRun = false)))

        await(sampleFileProvider.get(sampleID)) should not be empty
        new File(meta.path) should exist
      }
    }

    "use the 3 hour window for temporary accounts" taggedAs SQLDatabaseTestTag in {
      async {
        val user = await(userProvider.createTemporaryUser("retention-token-user", "10.0.0.1")).get

        // 10 days is inside the 180 day registered window and outside the 3 hour temporary one, so
        // this fails if the sweeper picks the window by anything other than the account type. The
        // fresh sample is an hour old: with a three hour window it is the only side of the boundary
        // a whole number of days can no longer express.
        val (expiredID, expiredMeta) = await(storeSample(user, "tokenold", ageSeconds = 10L * Day))
        val (freshID, freshMeta)     = await(storeSample(user, "tokennew", ageSeconds = 1L * Hour))

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

        val (demoSampleID, demoMeta)           = await(storeSample(demoUser, "demoancient", ageSeconds = 4000L * Day))
        val (unlimitedSampleID, unlimitedMeta) = await(storeSample(unlimitedUser, "adminancient", ageSeconds = 4000L * Day))

        val _ = await(retentionProvider.sweep(policy(dryRun = false)))

        await(sampleFileProvider.get(demoSampleID)) should not be empty
        new File(demoMeta.path) should exist

        await(sampleFileProvider.get(unlimitedSampleID)) should not be empty
        new File(unlimitedMeta.path) should exist
      }
    }
  }
}

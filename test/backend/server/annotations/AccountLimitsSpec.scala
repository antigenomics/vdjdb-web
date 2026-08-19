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

package backend.server.annotations

import backend.BaseTestSpec
import backend.utils.UtilsTestTag
import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.files.sample.SampleRetentionConfiguration
import backend.models.usage.UsageConfiguration
import backend.server.annotations.api.user.AccountLimits
import com.typesafe.config.ConfigFactory
import play.api.Configuration

/** The point of this type is that the page shows numbers that are actually enforced. Every assertion
  * below pins a row to the setting it is meant to be reporting. */
class AccountLimitsSpec extends BaseTestSpec {
  private final val Hour: Long = 60L * 60L
  private final val Day: Long  = 24L * Hour

  private val conf = Configuration(ConfigFactory.parseString(
    """application.annotations.upload.maxClonotypesCountRegistered = 1000000
      |application.annotations.upload.maxClonotypesCountTemporary = 200000
      |application.auth.temporary.keep = 3 hours""".stripMargin))

  private val usage = UsageConfiguration(
    enabled = true, uploadsPerDayRegistered = 100, uploadsPerDayTemporary = 20,
    uploadsPerDayPerIP = 200, annotationsPerDayRegistered = 100, annotationsPerDayTemporary = 20,
    tokensPerDayPerIP = 10)

  private val retention = SampleRetentionConfiguration(
    enabled = true, dryRun = true, intervalSeconds = 30L * 60L,
    keepRegisteredSeconds = 180L * Day, keepTemporarySeconds = 3L * Hour, epochMillis = 0L)

  private def permissions(id: Long, maxFilesCount: Int = 42): UserPermissions =
    UserPermissions(id, maxFilesCount, 64L, isUploadAllowed = true, isDeleteAllowed = true,
      isChangePasswordAllowed = true)

  private def limits(isTemporary: Boolean, id: Long, maxFilesCount: Int = 42): AccountLimits =
    AccountLimits(isTemporary, permissions(id, maxFilesCount), conf, usage, retention)

  "AccountLimits" should {

    "report the registered tier for a registered account" taggedAs UtilsTestTag in {
      val registered = limits(isTemporary = false, UserPermissionsProvider.DEFAULT_ID)

      registered.accountType shouldEqual "registered"
      registered.maxSamples shouldEqual 42
      registered.uploadsPerDay shouldEqual 100
      registered.annotationsPerDay shouldEqual 100
      registered.maxClonotypes shouldEqual 1000000
      registered.sampleRetention shouldEqual "180d"
      // A registered account does not expire, and saying "kept for 0s" would be a lie in the
      // frightening direction.
      registered.accountRetention shouldEqual None
    }

    "report the token tier, including the window the account itself lives in" taggedAs UtilsTestTag in {
      val token = limits(isTemporary = true, UserPermissionsProvider.TEMPORARY_ID, maxFilesCount = 10)

      token.accountType shouldEqual "token"
      token.maxSamples shouldEqual 10
      token.uploadsPerDay shouldEqual 20
      token.annotationsPerDay shouldEqual 20
      token.maxClonotypes shouldEqual 200000
      token.sampleRetention shouldEqual "3h"
      token.accountRetention shouldEqual Some("3h")
    }

    "claim no ceiling for the accounts that are exempt in code" taggedAs UtilsTestTag in {
      // DEMO and UNLIMITED are skipped by both the retention sweeper and the quota checks. Printing a
      // quota at them would be reporting a rule nothing enforces.
      Seq(UserPermissionsProvider.DEMO_ID, UserPermissionsProvider.UNLIMITED_ID).foreach { id =>
        val exempt = limits(isTemporary = false, id)
        exempt.uploadsPerDay shouldEqual AccountLimits.Unlimited
        exempt.annotationsPerDay shouldEqual AccountLimits.Unlimited
        exempt.sampleRetention shouldEqual "kept indefinitely"
      }
      limits(isTemporary = false, UserPermissionsProvider.DEMO_ID).accountType shouldEqual "demo"
    }

    "fall back to documented values when the server config omits the keys" taggedAs UtilsTestTag in {
      // Production replaces application.conf wholesale, so these keys are absent there until someone
      // edits the server-side file. Missing must degrade to a default, never crash on boot.
      val bare = AccountLimits(isTemporary = true, permissions(UserPermissionsProvider.TEMPORARY_ID, 10),
        Configuration(ConfigFactory.empty()), usage, retention)

      bare.maxClonotypes shouldEqual AccountLimits.DefaultMaxClonotypesTemporary
      bare.accountRetention shouldEqual Some("3h")
    }

    "not report a quota the server has switched off" taggedAs UtilsTestTag in {
      val off = AccountLimits(isTemporary = true, permissions(UserPermissionsProvider.TEMPORARY_ID, 10),
        conf, usage.copy(enabled = false), retention.copy(enabled = false))

      off.uploadsPerDay shouldEqual AccountLimits.Unlimited
      off.sampleRetention shouldEqual "kept indefinitely"
    }
  }
}

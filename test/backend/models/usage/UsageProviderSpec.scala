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

package backend.models.usage

import java.time.LocalDate

import backend.BaseTestSpec
import backend.actions.UtilsTestTag
import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import com.typesafe.config.ConfigFactory
import play.api.Configuration

class UsageProviderSpec extends BaseTestSpec {

  private final val registered = UserPermissions(UserPermissionsProvider.DEFAULT_ID, 42, 16L,
    isUploadAllowed = true, isDeleteAllowed = true, isChangePasswordAllowed = true)
  private final val temporary = UserPermissions(UserPermissionsProvider.TEMPORARY_ID, 10, 8L,
    isUploadAllowed = true, isDeleteAllowed = true, isChangePasswordAllowed = false)
  private final val demo = UserPermissions(UserPermissionsProvider.DEMO_ID, 0, 0L,
    isUploadAllowed = false, isDeleteAllowed = false, isChangePasswordAllowed = false)
  private final val unlimited = UserPermissions(UserPermissionsProvider.UNLIMITED_ID, -1, -1L,
    isUploadAllowed = true, isDeleteAllowed = true, isChangePasswordAllowed = true)

  private final val today    = LocalDate.of(2026, 7, 20)
  private final val tomorrow = today.plusDays(1)

  private def provider(hocon: String): UsageProvider = new UsageProvider(Configuration(ConfigFactory.parseString(hocon)))

  /** Small enough to exhaust in a test, and each limit distinct so a mixed-up counter shows up as a
    * wrong number rather than an accidentally-passing assertion. */
  private final val tightLimits =
    """application.annotations.quota {
      |  uploadsPerDayRegistered = 2
      |  uploadsPerDayTemporary = 1
      |  uploadsPerDayPerIP = 3
      |  annotationsPerDayRegistered = 2
      |  annotationsPerDayTemporary = 1
      |}""".stripMargin

  "UsageConfiguration" should {

    "fall back to the documented defaults when the keys are absent" taggedAs UtilsTestTag in {
      // Production replaces application.conf wholesale with its own file, so every key added here is
      // missing there until someone edits it by hand. Missing must mean "default", never "crash".
      val configuration = provider("").getConfiguration

      configuration.enabled shouldEqual true
      configuration.uploadsPerDayRegistered shouldEqual 200
      configuration.uploadsPerDayTemporary shouldEqual 50
      configuration.uploadsPerDayPerIP shouldEqual 200
      configuration.annotationsPerDayRegistered shouldEqual 200
      configuration.annotationsPerDayTemporary shouldEqual 50
    }

    "read the values that are present" taggedAs UtilsTestTag in {
      val configuration = provider(tightLimits).getConfiguration

      configuration.uploadsPerDayRegistered shouldEqual 2
      configuration.uploadsPerDayTemporary shouldEqual 1
      configuration.uploadsPerDayPerIP shouldEqual 3
    }
  }

  "UsageProvider" should {

    "allow uploads up to the per-user limit and reject the next one" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)

      usage.checkUploadOn(today, 1L, isTemporary = false, registered, "10.0.0.1") shouldBe empty
      usage.checkUploadOn(today, 1L, isTemporary = false, registered, "10.0.0.1") shouldBe empty
      usage.checkUploadOn(today, 1L, isTemporary = false, registered, "10.0.0.1") should not be empty

      usage.uploadsForUser(today, 1L) shouldEqual 2
    }

    "apply the lower limit to temporary accounts" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)

      usage.checkUploadOn(today, 7L, isTemporary = true, temporary, "10.0.0.2") shouldBe empty
      usage.checkUploadOn(today, 7L, isTemporary = true, temporary, "10.0.0.2") should not be empty
    }

    "count each account separately" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)

      usage.checkUploadOn(today, 1L, isTemporary = false, registered, "10.0.0.1") shouldBe empty
      usage.checkUploadOn(today, 2L, isTemporary = false, registered, "10.0.0.2") shouldBe empty

      usage.uploadsForUser(today, 1L) shouldEqual 1
      usage.uploadsForUser(today, 2L) shouldEqual 1
    }

    "reject on the per-IP limit even when every account is under its own" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)
      val ip    = "10.0.0.9"

      // Three different accounts, one upload each: nobody is near the per-user limit of 2, but the
      // address is now at its limit of 3. This is the shared-NAT / token-farming case.
      usage.checkUploadOn(today, 11L, isTemporary = false, registered, ip) shouldBe empty
      usage.checkUploadOn(today, 12L, isTemporary = false, registered, ip) shouldBe empty
      usage.checkUploadOn(today, 13L, isTemporary = false, registered, ip) shouldBe empty

      val rejection = usage.checkUploadOn(today, 14L, isTemporary = false, registered, ip)
      rejection should not be empty
      rejection.get should include("from this address")

      // The rejected attempt must not have spent the fourth account's own allowance.
      usage.uploadsForUser(today, 14L) shouldEqual 0
      usage.uploadsForIP(today, ip) shouldEqual 3
    }

    "reset every counter when the date rolls over" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)
      val ip    = "10.0.0.3"

      usage.checkUploadOn(today, 21L, isTemporary = false, registered, ip) shouldBe empty
      usage.checkUploadOn(today, 21L, isTemporary = false, registered, ip) shouldBe empty
      usage.checkAnnotateOn(today, 21L, isTemporary = false, registered) shouldBe empty
      usage.checkAnnotateOn(today, 21L, isTemporary = false, registered) shouldBe empty

      // Exhausted on the last day of the window ...
      usage.checkUploadOn(today, 21L, isTemporary = false, registered, ip) should not be empty
      usage.checkAnnotateOn(today, 21L, isTemporary = false, registered) should not be empty

      // ... and allowed again on the first call that carries the next date, on every axis.
      usage.checkUploadOn(tomorrow, 21L, isTemporary = false, registered, ip) shouldBe empty
      usage.checkAnnotateOn(tomorrow, 21L, isTemporary = false, registered) shouldBe empty

      usage.uploadsForUser(tomorrow, 21L) shouldEqual 1
      usage.uploadsForIP(tomorrow, ip) shouldEqual 1
      usage.annotationsForUser(tomorrow, 21L) shouldEqual 1
    }

    "allow annotations up to the per-user limit and reject the next one" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)

      usage.checkAnnotateOn(today, 31L, isTemporary = false, registered) shouldBe empty
      usage.checkAnnotateOn(today, 31L, isTemporary = false, registered) shouldBe empty
      usage.checkAnnotateOn(today, 31L, isTemporary = false, registered) should not be empty

      usage.checkAnnotateOn(today, 32L, isTemporary = true, temporary) shouldBe empty
      usage.checkAnnotateOn(today, 32L, isTemporary = true, temporary) should not be empty
    }

    "never limit DEMO or UNLIMITED accounts" taggedAs UtilsTestTag in {
      val usage = provider(tightLimits)

      // DEMO is a shared login offered from the navbar, so a per-user counter on it would lock every
      // visitor out rather than throttle an abuser; UNLIMITED is the administrative account.
      (1 to 10).foreach { _ =>
        usage.checkAnnotateOn(today, 41L, isTemporary = false, demo) shouldBe empty
        usage.checkUploadOn(today, 42L, isTemporary = false, unlimited, "10.0.0.4") shouldBe empty
      }

      usage.annotationsForUser(today, 41L) shouldEqual 0
      usage.uploadsForUser(today, 42L) shouldEqual 0
    }

    "not limit anything when quotas are disabled" taggedAs UtilsTestTag in {
      val usage = provider("application.annotations.quota { enabled = false, uploadsPerDayRegistered = 1 }")

      usage.checkUploadOn(today, 51L, isTemporary = false, registered, "10.0.0.5") shouldBe empty
      usage.checkUploadOn(today, 51L, isTemporary = false, registered, "10.0.0.5") shouldBe empty
    }
  }
}

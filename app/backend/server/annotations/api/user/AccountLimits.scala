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

package backend.server.annotations.api.user

import java.util.concurrent.TimeUnit

import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.files.sample.SampleRetentionConfiguration
import backend.models.usage.UsageConfiguration
import play.api.Configuration
import play.api.libs.json.{Json, Writes}

/** The limits in force for one account, resolved for that account rather than described in general.
  *
  * They were previously spread across three places that only the server could see — `USER_PERMISSIONS`
  * for the sample count and file size, `application.annotations.*` for the clonotype cap and the daily
  * quotas, `application.auth.temporary` for the token window — and the annotations page said only
  * "limits on the number of samples, sample file size and number of clonotypes apply". A user found out
  * what the numbers were by hitting one.
  *
  * Resolved server-side, per account, because the two account types differ on most rows and a client
  * that had to work out which set applies to it would be a second implementation of the same policy.
  *
  * @param maxSamples        stored at once (`USER_PERMISSIONS.MAX_FILES_COUNT`)
  * @param maxFileSizeMb     per uploaded file, compressed, in MiB
  * @param maxClonotypes     rows in one sample after conversion
  * @param sampleRetention   how long an uploaded sample is kept, already formatted
  * @param accountRetention  how long the account itself survives, idle; `None` for accounts that do
  *                          not expire, which is every registered one
  */
case class AccountLimits(accountType: String,
                         maxSamples: Int,
                         maxFileSizeMb: Long,
                         maxClonotypes: Int,
                         uploadsPerDay: Int,
                         annotationsPerDay: Int,
                         sampleRetention: String,
                         accountRetention: Option[String])

object AccountLimits {
  implicit val accountLimitsWrites: Writes[AccountLimits] = Json.writes[AccountLimits]

  final val MaxClonotypesPath: String = "application.annotations.upload.maxClonotypesCount"
  final val TemporaryKeepPath: String = "application.auth.temporary.keep"

  final val DefaultMaxClonotypes: Int          = 100000
  final val DefaultTemporaryKeepSeconds: Long  = 3L * 60L * 60L

  /** Negative means "no ceiling", matching how `UsageConfiguration` already encodes an unlimited quota.
    * Kept as a number rather than an `Option` so the client renders one rule for every row. */
  final val Unlimited: Int = -1

  /** Takes `isTemporary` rather than the `User` it comes from: that flag is the only thing about the
    * account this needs, and depending on the whole row would make the policy untestable without a
    * database. */
  def apply(isTemporary: Boolean, permissions: UserPermissions, conf: Configuration,
            usage: UsageConfiguration, retention: SampleRetentionConfiguration): AccountLimits = {
    // The same two accounts the retention sweeper and the quota checks exempt in code. Reporting a
    // number here that is not enforced anywhere would be worse than reporting none.
    val isExempt = permissions.id == UserPermissionsProvider.UNLIMITED_ID ||
      permissions.id == UserPermissionsProvider.DEMO_ID

    AccountLimits(
      accountType = if (permissions.id == UserPermissionsProvider.DEMO_ID) "demo"
                    else if (permissions.id == UserPermissionsProvider.UNLIMITED_ID) "unlimited"
                    else if (isTemporary) "token"
                    else "registered",
      maxSamples = permissions.maxFilesCount,
      maxFileSizeMb = permissions.maxFileSize,
      maxClonotypes = conf.getOptional[Int](MaxClonotypesPath).getOrElse(DefaultMaxClonotypes),
      uploadsPerDay = if (isExempt || !usage.enabled) Unlimited else usage.uploadsPerDay(isTemporary),
      annotationsPerDay = if (isExempt || !usage.enabled) Unlimited else usage.annotationsPerDay(isTemporary),
      sampleRetention = if (isExempt || !retention.enabled) "kept indefinitely"
                        else SampleRetentionConfiguration.window(retention.keepSeconds(isTemporary)),
      accountRetention = if (isTemporary) Some(SampleRetentionConfiguration.window(temporaryKeepSeconds(conf)))
                         else None
    )
  }

  /** Read defensively for the same reason every other key here is: production starts with
    * `-Dconfig.file=<server-side file>`, which replaces the packaged `application.conf` instead of
    * merging with it, so a key added here does not exist there until someone edits that file. */
  private def temporaryKeepSeconds(conf: Configuration): Long =
    if (conf.underlying.hasPath(TemporaryKeepPath)) conf.underlying.getDuration(TemporaryKeepPath, TimeUnit.SECONDS)
    else DefaultTemporaryKeepSeconds
}

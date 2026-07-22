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

import java.util.concurrent.TimeUnit

import play.api.Configuration

import scala.util.Try

/** How long a stored sample is kept before the retention sweeper removes it.
  *
  * Windows are held in seconds because that is what both [[backend.utils.TimeUtils]] and the Akka
  * scheduler want, and because it keeps the whole policy comparable in one unit when it is logged.
  *
  * @param dryRun when true the sweeper reports what it would delete and deletes nothing. This is the
  *               shipped default on purpose: a retention sweeper that misfires the first time it
  *               meets real data destroys user uploads permanently and there is no undo. Flip it
  *               only after a run has been read in the logs and looks right.
  * @param epochMillis a floor on how old a sample can be considered. A sample created before this
  *               instant is aged from the instant instead of from its own `CREATED_AT`, which gives
  *               everything already on disk a full window starting here.
  *
  *               This exists because retention was switched on over an archive, not a fresh site:
  *               measured on production, 1,375 of 1,443 registered samples predate a 365 day window,
  *               the oldest by eight years. Without a floor, enabling the sweeper is not housekeeping
  *               but a near-total wipe on the first pass. Rewriting `CREATED_AT` in the database
  *               would have the same effect, but it destroys the only record of when the data arrived
  *               and it feeds export filenames via `FileMetadata.getNameWithDateAndExtension`.
  *               0 disables the floor and ages everything from its real timestamp.
  */
final case class SampleRetentionConfiguration(enabled: Boolean,
                                              dryRun: Boolean,
                                              intervalSeconds: Long,
                                              keepRegisteredSeconds: Long,
                                              keepTemporarySeconds: Long,
                                              epochMillis: Long) {

  def keepSeconds(isTemporary: Boolean): Long = if (isTemporary) keepTemporarySeconds else keepRegisteredSeconds

  /** When a sample starts ageing: its own creation time, or the configured floor if that is later. */
  def effectiveCreatedAt(createdAtMillis: Long): Long = math.max(createdAtMillis, epochMillis)

  def describe: String =
    s"enabled=$enabled, dryRun=$dryRun, every ${SampleRetentionConfiguration.window(intervalSeconds)}, " +
      s"keep ${SampleRetentionConfiguration.window(keepRegisteredSeconds)} (registered) / " +
      s"${SampleRetentionConfiguration.window(keepTemporarySeconds)} (temporary)" +
      (if (epochMillis > 0L) s", ageing nothing from before ${new java.sql.Timestamp(epochMillis)}" else "")
}

object SampleRetentionConfiguration {
  final val Root = "application.annotations.retention"

  final val DefaultIntervalSeconds: Long       = 30L * 60L
  final val DefaultKeepRegisteredSeconds: Long = 365L * 24L * 60L * 60L
  final val DefaultKeepTemporarySeconds: Long  = 3L * 60L * 60L

  /** Every key is read with a default. Production starts with `-Dconfig.file=<server-side file>`,
    * which REPLACES the packaged `application.conf` rather than merging with it, so none of these
    * keys exist on the server until someone edits that file by hand. A `conf.get` on a missing key
    * throws while Guice is building the object graph and crash-loops the application on deploy. */
  def fromConfig(conf: Configuration): SampleRetentionConfiguration = SampleRetentionConfiguration(
    enabled = conf.getOptional[Boolean](s"$Root.enabled").getOrElse(true),
    dryRun = conf.getOptional[Boolean](s"$Root.dryRun").getOrElse(true),
    intervalSeconds = seconds(conf, s"$Root.interval", DefaultIntervalSeconds),
    keepRegisteredSeconds = seconds(conf, s"$Root.keepRegistered", DefaultKeepRegisteredSeconds),
    keepTemporarySeconds = seconds(conf, s"$Root.keepTemporary", DefaultKeepTemporarySeconds),
    epochMillis = epoch(conf, s"$Root.ageFrom")
  )

  /** `ageFrom` is an ISO-8601 instant, e.g. "2026-07-21T00:00:00Z". Anything unparseable is treated as
    * absent and logged nowhere on purpose — this is read while Guice builds the object graph, and a
    * throw here crash-loops the application on boot. Failing open (no floor) is the safe direction
    * only because the sweeper also ships `dryRun = true`. */
  private def epoch(conf: Configuration, path: String): Long =
    conf.getOptional[String](path).map(_.trim).filter(_.nonEmpty)
      .flatMap(value => Try(java.time.Instant.parse(value).toEpochMilli).toOption)
      .getOrElse(0L)

  /** HOCON durations (`7 days`) go through the underlying typesafe `Config`, which is the same API
    * the hand-written `ConfigLoader`s in this codebase already use. `hasPath` keeps the read
    * defensive in exactly the way `getOptional` does for the scalar keys above. */
  private def seconds(conf: Configuration, path: String, default: Long): Long = {
    if (conf.underlying.hasPath(path)) conf.underlying.getDuration(path, TimeUnit.SECONDS) else default
  }

  /** Largest whole unit that fits, so a window reads at the scale it was configured in. The previous
    * version only knew days, which printed the three-hour token window as "0d" in the per-sample log
    * line — indistinguishable from a misconfigured zero, on the one line an operator reads to confirm
    * the sweeper is deleting the right things. */
  private[sample] def window(seconds: Long): String = {
    if (seconds >= 24L * 60L * 60L) s"${seconds / (24L * 60L * 60L)}d"
    else if (seconds >= 60L * 60L) s"${seconds / (60L * 60L)}h"
    else if (seconds >= 60L) s"${seconds / 60L}m"
    else s"${seconds}s"
  }
}

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

/** How long a stored sample is kept before the retention sweeper removes it.
  *
  * Windows are held in seconds because that is what both [[backend.utils.TimeUtils]] and the Akka
  * scheduler want, and because it keeps the whole policy comparable in one unit when it is logged.
  *
  * @param dryRun when true the sweeper reports what it would delete and deletes nothing. This is the
  *               shipped default on purpose: a retention sweeper that misfires the first time it
  *               meets real data destroys user uploads permanently and there is no undo. Flip it
  *               only after a run has been read in the logs and looks right.
  */
final case class SampleRetentionConfiguration(enabled: Boolean,
                                              dryRun: Boolean,
                                              intervalSeconds: Long,
                                              keepRegisteredSeconds: Long,
                                              keepTemporarySeconds: Long) {

  def keepSeconds(isTemporary: Boolean): Long = if (isTemporary) keepTemporarySeconds else keepRegisteredSeconds

  def describe: String =
    s"enabled=$enabled, dryRun=$dryRun, every ${SampleRetentionConfiguration.days(intervalSeconds)}, " +
      s"keep ${SampleRetentionConfiguration.days(keepRegisteredSeconds)} (registered) / " +
      s"${SampleRetentionConfiguration.days(keepTemporarySeconds)} (temporary)"
}

object SampleRetentionConfiguration {
  final val Root = "application.annotations.retention"

  final val DefaultIntervalSeconds: Long       = 24L * 60L * 60L
  final val DefaultKeepRegisteredSeconds: Long = 365L * 24L * 60L * 60L
  final val DefaultKeepTemporarySeconds: Long  = 7L * 24L * 60L * 60L

  /** Every key is read with a default. Production starts with `-Dconfig.file=<server-side file>`,
    * which REPLACES the packaged `application.conf` rather than merging with it, so none of these
    * keys exist on the server until someone edits that file by hand. A `conf.get` on a missing key
    * throws while Guice is building the object graph and crash-loops the application on deploy. */
  def fromConfig(conf: Configuration): SampleRetentionConfiguration = SampleRetentionConfiguration(
    enabled = conf.getOptional[Boolean](s"$Root.enabled").getOrElse(true),
    dryRun = conf.getOptional[Boolean](s"$Root.dryRun").getOrElse(true),
    intervalSeconds = seconds(conf, s"$Root.interval", DefaultIntervalSeconds),
    keepRegisteredSeconds = seconds(conf, s"$Root.keepRegistered", DefaultKeepRegisteredSeconds),
    keepTemporarySeconds = seconds(conf, s"$Root.keepTemporary", DefaultKeepTemporarySeconds)
  )

  /** HOCON durations (`7 days`) go through the underlying typesafe `Config`, which is the same API
    * the hand-written `ConfigLoader`s in this codebase already use. `hasPath` keeps the read
    * defensive in exactly the way `getOptional` does for the scalar keys above. */
  private def seconds(conf: Configuration, path: String, default: Long): Long = {
    if (conf.underlying.hasPath(path)) conf.underlying.getDuration(path, TimeUnit.SECONDS) else default
  }

  private def days(seconds: Long): String = {
    val d = seconds / (24L * 60L * 60L)
    if (d > 0) s"${d}d" else s"${seconds}s"
  }
}

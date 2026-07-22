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

package backend.models.usage

import play.api.Configuration

/** Per-day usage ceilings.
  *
  * These bound *work started per day*, which is a different axis from `play.filters.limits`
  * (short-window request rate per IP) and from `USER_PERMISSIONS.MAX_FILES_COUNT` (how much may be
  * stored at once). All three are needed: a caller who stays under the request rate and repeatedly
  * uploads-then-deletes never trips either of the other two.
  */
final case class UsageConfiguration(enabled: Boolean,
                                    uploadsPerDayRegistered: Int,
                                    uploadsPerDayTemporary: Int,
                                    uploadsPerDayPerIP: Int,
                                    annotationsPerDayRegistered: Int,
                                    annotationsPerDayTemporary: Int,
                                    tokensPerDayPerIP: Int) {

  def uploadsPerDay(isTemporary: Boolean): Int =
    if (isTemporary) uploadsPerDayTemporary else uploadsPerDayRegistered

  def annotationsPerDay(isTemporary: Boolean): Int =
    if (isTemporary) annotationsPerDayTemporary else annotationsPerDayRegistered

  def describe: String =
    s"enabled=$enabled, uploads/day=$uploadsPerDayRegistered (registered) / $uploadsPerDayTemporary (token), " +
      s"uploads/day/IP=$uploadsPerDayPerIP, " +
      s"annotations/day=$annotationsPerDayRegistered (registered) / $annotationsPerDayTemporary (token), " +
      s"tokens/day/IP=$tokensPerDayPerIP"
}

object UsageConfiguration {
  final val Root = "application.annotations.quota"

  final val DefaultUploadsPerDayRegistered: Int     = 100
  final val DefaultUploadsPerDayTemporary: Int      = 20
  final val DefaultUploadsPerDayPerIP: Int          = 200
  final val DefaultAnnotationsPerDayRegistered: Int = 100
  final val DefaultAnnotationsPerDayTemporary: Int  = 20
  final val DefaultTokensPerDayPerIP: Int          = 10

  /** Every key is read with a default. Production starts with `-Dconfig.file=<server-side file>`,
    * which REPLACES the packaged `application.conf` rather than merging with it, so none of these
    * keys exist on the server until someone edits that file by hand. A `conf.get` on a missing key
    * throws while Guice is building the object graph, which crash-loops the whole application on
    * deploy — that has already happened on this project once. */
  def fromConfig(conf: Configuration): UsageConfiguration = UsageConfiguration(
    enabled = conf.getOptional[Boolean](s"$Root.enabled").getOrElse(true),
    uploadsPerDayRegistered = conf.getOptional[Int](s"$Root.uploadsPerDayRegistered").getOrElse(DefaultUploadsPerDayRegistered),
    uploadsPerDayTemporary = conf.getOptional[Int](s"$Root.uploadsPerDayTemporary").getOrElse(DefaultUploadsPerDayTemporary),
    uploadsPerDayPerIP = conf.getOptional[Int](s"$Root.uploadsPerDayPerIP").getOrElse(DefaultUploadsPerDayPerIP),
    annotationsPerDayRegistered =
      conf.getOptional[Int](s"$Root.annotationsPerDayRegistered").getOrElse(DefaultAnnotationsPerDayRegistered),
    annotationsPerDayTemporary =
      conf.getOptional[Int](s"$Root.annotationsPerDayTemporary").getOrElse(DefaultAnnotationsPerDayTemporary),
    tokensPerDayPerIP = conf.getOptional[Int](s"$Root.tokensPerDayPerIP").getOrElse(DefaultTokensPerDayPerIP)
  )
}

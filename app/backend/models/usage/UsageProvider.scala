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

import java.time.LocalDate
import java.util.concurrent.atomic.{AtomicInteger, AtomicReference}

import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.authorization.user.User
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration

import scala.collection.concurrent.TrieMap

/** Daily counters for one calendar day.
  *
  * File-scoped and mutable-inside rather than a nested case class: a case class declared inside a
  * class gets a synthetic `equals` whose type test carries an outer reference the compiler cannot
  * verify, and `-Xfatal-warnings` turns that warning into a build failure.
  *
  * `TrieMap`, not `mutable.HashMap`: uploads arrive on Play's request threads and annotate runs
  * arrive on the websocket actor's thread and on the `scala.async` continuation pool, so these maps
  * are structurally modified concurrently with no lock anywhere. An unsynchronized `HashMap` under
  * that load can lose entries or spin during a resize.
  */
private[usage] final class UsageCounters(val date: LocalDate) {
  val uploadsByUser: TrieMap[Long, AtomicInteger]     = TrieMap.empty
  val uploadsByIP: TrieMap[String, AtomicInteger]     = TrieMap.empty
  val annotationsByUser: TrieMap[Long, AtomicInteger] = TrieMap.empty
  val tokensByIP: TrieMap[String, AtomicInteger]      = TrieMap.empty
}

/** Per-day upload / annotate quotas, keyed by user and by client IP.
  *
  * Deliberately in-memory and not persisted: the counters are a fairness device, not an audit trail,
  * and a restart handing everybody a fresh allowance is a far better failure mode than a schema and
  * a write on every upload. They are also *not* a substitute for `USER_PERMISSIONS.MAX_FILES_COUNT`
  * — that caps what is stored at any instant, this caps how much work is started per day.
  */
@Singleton
class UsageProvider @Inject()(conf: Configuration) {
  final private val logger        = LoggerFactory.getLogger(this.getClass)
  final private val configuration = UsageConfiguration.fromConfig(conf)

  /** Swapped wholesale when the date rolls over, which is how yesterday's counters are evicted:
    * there is no per-key expiry and therefore no way for the maps to grow without bound. */
  final private val counters = new AtomicReference[UsageCounters](new UsageCounters(LocalDate.now()))

  logger.info(s"Usage quotas: ${configuration.describe}")

  def getConfiguration: UsageConfiguration = configuration

  /** `None` when the upload may proceed (and the attempt has been counted), `Some(message)` when a
    * quota is exhausted. Attempts are counted, not successes: a caller who can burn a slot only by
    * succeeding can retry an invalid upload forever. */
  def checkUpload(user: User, permissions: UserPermissions, ip: String): Option[String] =
    checkUploadOn(LocalDate.now(), user.id, user.isTemporary, permissions, ip)

  /** `None` when the annotation run may proceed (and has been counted), `Some(message)` otherwise. */
  def checkAnnotate(user: User, permissions: UserPermissions): Option[String] =
    checkAnnotateOn(LocalDate.now(), user.id, user.isTemporary, permissions)

  /** `None` when a temporary token may be minted from this address (and the attempt has been counted).
    *
    * A different axis from `application.auth.temporary.maxForOneIP`, which caps how many temporary
    * accounts from one address are alive at once. That is a ceiling on concurrent state, and the reaper
    * keeps lowering it: once an account ages out its slot is freed, so an address can hold 30 forever
    * and still mint an unbounded number over time. This caps the rate instead.
    *
    * Counted before the account exists, so there is no `UserPermissions` to exempt on - DEMO and
    * UNLIMITED never take this path, since both are existing logins rather than signups.
    */
  def checkTokenSignup(ip: String): Option[Int] = checkTokenSignupOn(LocalDate.now(), ip)

  /** Takes the day and the account's identity apart from the `User` row so that a caller can pin the
    * date — the roll-over boundary is otherwise only reachable by waiting for midnight. */
  private[usage] def checkUploadOn(date: LocalDate, userID: Long, isTemporary: Boolean,
                                   permissions: UserPermissions, ip: String): Option[String] = {
    if (!configuration.enabled || isExempt(permissions)) {
      None
    } else {
      val today     = countersFor(date)
      val userLimit = configuration.uploadsPerDay(isTemporary)
      val ipLimit   = configuration.uploadsPerDayPerIP
      if (userLimit >= 0 && peek(today.uploadsByUser, userID) >= userLimit) {
        Some(s"Daily upload limit reached ($userLimit uploads per day for this account). Please try again tomorrow.")
      } else if (ipLimit >= 0 && peek(today.uploadsByIP, ip) >= ipLimit) {
        Some(s"Daily upload limit reached ($ipLimit uploads per day from this address). Please try again tomorrow.")
      } else {
        // Both counters are checked before either is incremented, so a rejection never spends an
        // allowance on the axis that was still under its limit.
        hit(today.uploadsByUser, userID)
        hit(today.uploadsByIP, ip)
        None
      }
    }
  }

  private[usage] def checkAnnotateOn(date: LocalDate, userID: Long, isTemporary: Boolean,
                                     permissions: UserPermissions): Option[String] = {
    if (!configuration.enabled || isExempt(permissions)) {
      None
    } else {
      val today = countersFor(date)
      val limit = configuration.annotationsPerDay(isTemporary)
      if (limit >= 0 && peek(today.annotationsByUser, userID) >= limit) {
        Some(s"Daily annotation limit reached ($limit runs per day for this account). Please try again tomorrow.")
      } else {
        hit(today.annotationsByUser, userID)
        None
      }
    }
  }

  /** @return the limit that was hit, or `None` when the signup may proceed. The number rather than a
    *         sentence, unlike the upload and annotate checks: those surface over a websocket with no
    *         `Messages` in scope, while this one lands on a Twirl page that has one - so the wording
    *         belongs in `messages.en` with the rest of the signup copy, not in here. */
  private[usage] def checkTokenSignupOn(date: LocalDate, ip: String): Option[Int] = {
    if (!configuration.enabled) {
      None
    } else {
      val limit = configuration.tokensPerDayPerIP
      if (limit >= 0 && peek(countersFor(date).tokensByIP, ip) >= limit) {
        Some(limit)
      } else {
        hit(countersFor(date).tokensByIP, ip)
        None
      }
    }
  }

  private[usage] def tokensForIP(date: LocalDate, ip: String): Int = peek(countersFor(date).tokensByIP, ip)

  private[usage] def uploadsForUser(date: LocalDate, userID: Long): Int = peek(countersFor(date).uploadsByUser, userID)

  private[usage] def uploadsForIP(date: LocalDate, ip: String): Int = peek(countersFor(date).uploadsByIP, ip)

  private[usage] def annotationsForUser(date: LocalDate, userID: Long): Int =
    peek(countersFor(date).annotationsByUser, userID)

  /** DEMO and UNLIMITED are exempt for the same reason they are exempt from retention: UNLIMITED is
    * the administrative account, and DEMO is a *shared* login offered from the navbar, so a per-user
    * daily counter on it would not throttle an abuser — it would lock every visitor out of the demo
    * once the day's allowance was spent by anyone. Demo accounts cannot upload at all
    * (`IS_UPLOAD_ALLOWED = false`), and both remain bound by the per-IP request filter. */
  private def isExempt(permissions: UserPermissions): Boolean =
    permissions.id == UserPermissionsProvider.UNLIMITED_ID || permissions.id == UserPermissionsProvider.DEMO_ID

  /** Returns the counters for `date`, replacing the whole set if the day has rolled over. A lost
    * race is harmless: the winner installed a set for the same date, so both callers agree. */
  private def countersFor(date: LocalDate): UsageCounters = {
    val current = counters.get()
    if (current.date == date) {
      current
    } else {
      val fresh = new UsageCounters(date)
      if (counters.compareAndSet(current, fresh)) fresh else counters.get()
    }
  }

  private def peek[K](bucket: TrieMap[K, AtomicInteger], key: K): Int =
    bucket.get(key).map(_.get()).getOrElse(0)

  private def hit[K](bucket: TrieMap[K, AtomicInteger], key: K): Unit = {
    val _ = bucket.getOrElseUpdate(key, new AtomicInteger(0)).incrementAndGet()
  }
}

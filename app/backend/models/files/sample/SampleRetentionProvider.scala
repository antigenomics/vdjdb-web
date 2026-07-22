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

import java.io.File
import java.util.concurrent.atomic.{AtomicBoolean, AtomicInteger}

import akka.actor.{ActorSystem, Cancellable}
import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.authorization.user.{User, UserProvider}
import backend.models.files.{FileMetadata, FileMetadataProvider}
import backend.utils.files.FileUtils
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.inject.ApplicationLifecycle

import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.postfixOps
import scala.util.control.NonFatal
import scala.util.{Failure, Success, Try}

/** What one pass of the sweeper saw. `expired` counts what matched the window; `deleted` stays at
  * zero in dry-run mode, which is how a log line tells the two apart at a glance.
  *
  * File-scoped rather than nested in the provider: a case class declared inside a class gets a
  * synthetic `equals` whose type test carries an unverifiable outer reference, and
  * `-Xfatal-warnings` turns that warning into a build failure.
  */
final case class RetentionSweepResult(scanned: Int, expired: Int, deleted: Int)

/** Deletes stored samples that are past their retention window.
  *
  * Age comes from `FILE_METADATA.CREATED_AT`; `SAMPLE_FILE` carries no timestamp of its own, so
  * every decision here joins through the metadata row.
  *
  * Scheduling follows the existing reapers in
  * [[backend.models.authorization.user.UserProvider]] — an Akka `schedule` guarded by an interval of
  * zero, cancelled from an application stop hook.
  */
@Singleton
class SampleRetentionProvider @Inject()(conf: Configuration,
                                        up: UserProvider,
                                        sfp: SampleFileProvider,
                                        fmp: FileMetadataProvider,
                                        lifecycle: ApplicationLifecycle)
                                       (implicit ec: ExecutionContext, system: ActorSystem) {
  final private val logger        = LoggerFactory.getLogger(this.getClass)
  final private val configuration = SampleRetentionConfiguration.fromConfig(conf)

  logger.info(s"Sample retention: ${configuration.describe}")

  /** A pass is a sequential per-account fold with two round-trips each, over every account on the
    * instance, so a slow database can push one past the interval; nothing in the scheduler stops the
    * next tick from starting a second pass on top of it. The flag is taken here rather than inside
    * `sweep` so that a direct call — a test, a manual run — is unaffected by it. */
  final private val sweepInProgress = new AtomicBoolean(false)

  /** How many per-sample lines one dry-run pass prints before it stops listing them. Enough to see the
    * windows and the floor behaving on a range of accounts, small enough that a pass over an archive
    * that is years past its window does not reprint itself into the log every interval. */
  final private val DryRunReportLimit = 20

  final private val retentionScheduler: Option[Cancellable] =
    Option(configuration.enabled && configuration.intervalSeconds != 0).collect {
      case true =>
        system.scheduler.schedule(configuration.intervalSeconds seconds, configuration.intervalSeconds seconds) {
          if (sweepInProgress.compareAndSet(false, true)) {
            val pass = try {
              sweep()
            } catch {
              // A pass can also fail before it returns a future — a connection pool that is shutting
              // down throws rather than failing one — and that would leave the flag taken for good.
              case NonFatal(ex) => Future.failed[RetentionSweepResult](ex)
            }
            pass onComplete { outcome =>
              // Released on failure as well as success, or the guard latches on the first error and
              // retention stops for the life of the process without saying so.
              sweepInProgress.set(false)
              outcome match {
                case Failure(ex) =>
                  logger.warn("Cannot sweep expired sample files", ex)
                case Success(result) =>
                  logger.info(s"[retention] swept ${result.scanned} sample(s): ${result.expired} past their window, " +
                    s"${result.deleted} deleted${if (configuration.dryRun) " (dry run, nothing was removed)" else ""}")
              }
            }
          } else {
            logger.warn("[retention] skipping this pass: the previous one is still running after " +
              s"${configuration.intervalSeconds}s, which means the sweep has become slower than its interval")
          }
        }
    }

  lifecycle.addStopHook { () =>
    Future.successful(retentionScheduler.foreach(_.cancel()))
  }

  def getConfiguration: SampleRetentionConfiguration = configuration

  def sweep(): Future[RetentionSweepResult] = sweep(configuration)

  /** The policy is a parameter rather than only a field so a caller — including a test — can run a
    * pass under a window or a dry-run setting other than the deployed one. */
  def sweep(policy: SampleRetentionConfiguration): Future[RetentionSweepResult] = {
    val now = System.currentTimeMillis()
    // Counts the per-sample lines this pass has printed, so a dry run can show its working without
    // reprinting the whole archive every interval. See `report`.
    val reported = new AtomicInteger(0)
    up.getAllWithPermissions flatMap { users =>
      // Sequential fold rather than a parallel traverse: this runs once a day, and one account at a
      // time keeps both the connection use and the log readable.
      users.foldLeft(Future.successful(RetentionSweepResult(0, 0, 0))) {
        case (acc, (user, permissions)) => acc flatMap { result => sweepUser(policy, user, permissions, now, result, reported) }
      }
    }
  }

  private def sweepUser(policy: SampleRetentionConfiguration, user: User, permissions: UserPermissions,
                        now: Long, acc: RetentionSweepResult, reported: AtomicInteger): Future[RetentionSweepResult] = {
    if (isExempt(permissions)) {
      Future.successful(acc)
    } else {
      val keepSeconds = policy.keepSeconds(user.isTemporary)
      val cutoff      = now - keepSeconds * 1000L
      sfp.getByUserIDWithMetadata(user.id) flatMap { samples =>
        // Ages from `effectiveCreatedAt`, not the raw column, so the configured floor applies.
        val expired = samples.filter {
          case (_, metadata) => policy.effectiveCreatedAt(metadata.createdAt.getTime, user.isTemporary) < cutoff
        }
        expired.foreach { case (sample, metadata) => report(policy, user, sample, metadata, now, keepSeconds, reported) }
        val scanned = acc.scanned + samples.length
        if (policy.dryRun) {
          Future.successful(RetentionSweepResult(scanned, acc.expired + expired.length, acc.deleted))
        } else {
          Future.sequence(expired.map { case (_, metadata) => delete(user, metadata) }) map { removed =>
            RetentionSweepResult(scanned, acc.expired + expired.length, acc.deleted + removed.sum)
          }
        }
      }
    }
  }

  /** DEMO and UNLIMITED never expire. The demo account's samples are the shipped showcase dataset —
    * they live in the demo folder, are shared by every visitor, and are not re-uploadable — and
    * UNLIMITED is the administrative account. */
  private def isExempt(permissions: UserPermissions): Boolean =
    permissions.id == UserPermissionsProvider.UNLIMITED_ID || permissions.id == UserPermissionsProvider.DEMO_ID

  /** A real deletion is logged every time: it happens once per sample and it is the only record that
    * the file ever existed, so that is an audit trail rather than noise.
    *
    * A dry run is the opposite — it deletes nothing, so the same set reappears on every pass, and at
    * one unconditional line per sample that is the archive reprinted every interval forever into an
    * unrotated file. It cannot simply be silenced either: `application.conf` tells the operator to
    * read these lines and satisfy themselves before turning deletion on, and they are what makes that
    * possible. So a dry run prints the first `DryRunReportLimit` of them and then says how many it is
    * holding back — enough to check the windows and the floor are behaving, bounded regardless of how
    * far behind the archive is. */
  private def report(policy: SampleRetentionConfiguration, user: User, sample: SampleFile, metadata: FileMetadata,
                     now: Long, keepSeconds: Long, reported: AtomicInteger): Unit = {
    val count = reported.incrementAndGet()
    if (!policy.dryRun || count <= DryRunReportLimit) {
      val ageSeconds  = (now - metadata.createdAt.getTime) / 1000L
      // Both ages are logged when the floor is doing something, so a line always explains itself: a
      // sample can be eight years old and still be swept only because the floor is set a year back.
      val agedSeconds = (now - policy.effectiveCreatedAt(metadata.createdAt.getTime, user.isTemporary)) / 1000L
      val age         = if (agedSeconds == ageSeconds) s"age ${SampleRetentionConfiguration.window(ageSeconds)}"
                        else s"age ${SampleRetentionConfiguration.window(ageSeconds)}, " +
                          s"aged ${SampleRetentionConfiguration.window(agedSeconds)} from floor"
      val account     = if (user.isTemporary) "temporary" else "registered"
      val prefix      = if (policy.dryRun) "[retention][dry-run] would delete" else "[retention] deleting"
      logger.info(s"$prefix sample '${sample.sampleName}' of ${user.email} " +
        s"($age, window ${SampleRetentionConfiguration.window(keepSeconds)}, $account account)")
    } else if (count == DryRunReportLimit + 1) {
      logger.info(s"[retention][dry-run] listing only the first ${DryRunReportLimit} " +
        s"expired samples; the pass summary below carries the full count")
    }
  }

  /** Deleting the FILE_METADATA row cascades to SAMPLE_FILE, so the database side is one statement;
    * the files on disk have to be removed separately. */
  private def delete(user: User, metadata: FileMetadata): Future[Int] = {
    fmp.delete(metadata) map { rows =>
      deleteFolder(user, metadata)
      rows
    }
  }

  private def deleteFolder(user: User, metadata: FileMetadata): Unit = {
    // Canonical, not absolute: getAbsoluteFile leaves ".." in place, so "<root>/a/../../../etc" still
    // passes a startsWith check against "<root>/" and then deletes somewhere else entirely. Canonical
    // form also resolves symlinks, so neither side can be redirected out of the account that way.
    // It does hit the filesystem and can throw, so a row we cannot resolve is refused rather than
    // allowed to abort the whole sweep.
    val resolved = Try((new File(metadata.folder).getCanonicalFile, new File(user.folderPath).getCanonicalFile))
    resolved match {
      case Success((folder, root)) if folder.getPath.startsWith(root.getPath + File.separator) =>
        // Plain File.delete() is a silent no-op on a directory that still holds anything, which is one
        // of the ways orphaned upload folders accumulate. Take the whole tree.
        FileUtils.deleteRecursively(folder)
      case Success((folder, root)) =>
        // Belt and braces against a metadata row whose folder points outside the account (the demo
        // dataset is stored exactly like that). Exemptions should already have excluded these, and an
        // unbounded recursive delete driven by a database column is not a mistake worth risking twice.
        logger.warn(s"[retention] refusing to remove '${folder.getPath}': " +
          s"it is not inside the account folder '${root.getPath}'")
      case Failure(ex) =>
        logger.warn(s"[retention] refusing to remove '${metadata.folder}': cannot resolve it to a real path", ex)
    }
  }
}

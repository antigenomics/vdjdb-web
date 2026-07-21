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
import java.sql.Timestamp

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
import scala.util.{Failure, Success}

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

  final private val retentionScheduler: Option[Cancellable] =
    Option(configuration.enabled && configuration.intervalSeconds != 0).collect {
      case true =>
        system.scheduler.schedule(configuration.intervalSeconds seconds, configuration.intervalSeconds seconds) {
          sweep() onComplete {
            case Failure(ex) =>
              logger.warn("Cannot sweep expired sample files", ex)
            case Success(result) =>
              logger.info(s"[retention] swept ${result.scanned} sample(s): ${result.expired} past their window, " +
                s"${result.deleted} deleted${if (configuration.dryRun) " (dry run, nothing was removed)" else ""}")
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
    up.getAllWithPermissions flatMap { users =>
      // Sequential fold rather than a parallel traverse: this runs once a day, and one account at a
      // time keeps both the connection use and the log readable.
      users.foldLeft(Future.successful(RetentionSweepResult(0, 0, 0))) {
        case (acc, (user, permissions)) => acc flatMap { result => sweepUser(policy, user, permissions, now, result) }
      }
    }
  }

  private def sweepUser(policy: SampleRetentionConfiguration, user: User, permissions: UserPermissions,
                        now: Long, acc: RetentionSweepResult): Future[RetentionSweepResult] = {
    if (isExempt(permissions)) {
      Future.successful(acc)
    } else {
      val keepSeconds = policy.keepSeconds(user.isTemporary)
      val cutoff      = new Timestamp(now - keepSeconds * 1000L)
      sfp.getByUserIDWithMetadata(user.id) flatMap { samples =>
        val expired = samples.filter { case (_, metadata) => metadata.createdAt.before(cutoff) }
        expired.foreach { case (sample, metadata) => report(policy, user, sample, metadata, now, keepSeconds) }
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

  private def report(policy: SampleRetentionConfiguration, user: User, sample: SampleFile, metadata: FileMetadata,
                     now: Long, keepSeconds: Long): Unit = {
    val ageDays  = (now - metadata.createdAt.getTime) / (24L * 60L * 60L * 1000L)
    val keepDays = keepSeconds / (24L * 60L * 60L)
    val account  = if (user.isTemporary) "temporary" else "registered"
    val prefix   = if (policy.dryRun) "[retention][dry-run] would delete" else "[retention] deleting"
    logger.info(s"$prefix sample '${sample.sampleName}' of ${user.email} " +
      s"(age ${ageDays}d, window ${keepDays}d, $account account)")
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
    val folder = new File(metadata.folder).getAbsoluteFile
    val root   = new File(user.folderPath).getAbsoluteFile
    if (folder.getPath.startsWith(root.getPath + File.separator)) {
      // Plain File.delete() is a silent no-op on a directory that still holds anything, which is one
      // of the ways orphaned upload folders accumulate. Take the whole tree.
      FileUtils.deleteRecursively(folder)
    } else {
      // Belt and braces against a metadata row whose folder points outside the account (the demo
      // dataset is stored exactly like that). Exemptions should already have excluded these, and an
      // unbounded recursive delete driven by a database column is not a mistake worth risking twice.
      logger.warn(s"[retention] refusing to remove '${folder.getPath}': " +
        s"it is not inside the account folder '${root.getPath}'")
    }
  }
}

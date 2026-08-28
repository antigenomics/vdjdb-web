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

package backend.models.authorization.user

import java.io.File
import java.sql.Timestamp

import akka.actor.{ActorSystem, Cancellable}
import backend.models.authorization.forms.{SignupForm, SignupTemporaryForm}
import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.tokens.verification.{VerificationToken, VerificationTokenConfiguration, VerificationTokenProvider}
import backend.models.files.FileMetadataProvider
import backend.utils.files.sample.SampleConverter
import backend.models.files.sample.SampleFileProvider
import backend.utils.{CommonUtils, TimeUtils}
import com.antigenomics.vdjtools.misc.Software
import javax.inject.{Inject, Singleton}
import org.apache.commons.io.FilenameUtils
import org.mindrot.jbcrypt.BCrypt
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.inject.ApplicationLifecycle
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.jdbc.meta.MTable

import scala.async.Async.{async, await}
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.postfixOps
import scala.util.{Failure, Success}

@Singleton
/** Raised when an address already holds as many live temporary accounts as it is allowed.
  *
  * Carries the limit rather than a formatted sentence: the only thing that catches this renders it to a
  * person on the signup page, where `Messages` is in scope, so the wording lives with the rest of the
  * signup copy in `messages.en`.
  */
final case class TooManyTemporaryUsersException(limit: Int)
  extends RuntimeException(s"An address may hold $limit live temporary accounts at once")

class UserProvider @Inject()(
  @NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider,
  vtp: VerificationTokenProvider,
  stp: SessionTokenProvider,
  lifecycle: ApplicationLifecycle
)(implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem, upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider)
    extends HasDatabaseConfigProvider[JdbcProfile] {
  final private val logger                     = LoggerFactory.getLogger(this.getClass)
  final private val configuration              = conf.get[VerificationTokenConfiguration]("application.auth.verification")
  final private val usersConfiguration         = conf.get[UserCreateConfiguration]("application.auth.common")
  final private val demoUserConfiguration      = conf.get[DemoUserConfiguration]("application.auth.demo")
  final private val temporaryUserConfiguration = conf.get[TemporaryUserConfiguration]("application.auth.temporary")

  import dbConfig.profile.api._

  final private val table = TableQuery[UserTable]

  if (usersConfiguration.enableDefaultUsers && usersConfiguration.createUsers.nonEmpty) {
    logger.info("Initial users: ")
    usersConfiguration.createUsers.foreach(
      user =>
        async {
          val check = await(get(user._2))
          if (check.isEmpty) {
            verifyUser(await(createUser(user._1, user._2, user._3, user._4.toLong)))
            logger.info(s"User ${user._2} has been created")
          } else {
            logger.info(s"User ${user._2} already created")
          }
        }
    )
  } else if (!usersConfiguration.enableDefaultUsers && usersConfiguration.clearDefaultUsers) {
    logger.info("Clearing initial users: ")
    usersConfiguration.createUsers.foreach(
      user =>
        async {
          val check = await(get(user._2))
          if (check.isDefined) {
            await(delete(check.get))
            logger.info(s"User ${user._2} has been deleted")
          }
        }
    )
  }

  /** The only dialect a demo sample can be, because that is what it is registered and loaded as. */
  private final val VdjtoolsFormat: String = "VDJtools"

  /** Drops any demo sample the account cannot actually open.
    *
    * The other half of "the demo directory is the source of truth". Seeding only ever added, so
    * anything that stopped being loadable kept its row and the account went on offering it. Two ways
    * that happened on production, and both were live at once:
    *
    *   - the file was removed from the directory. Ten of the thirteen demo samples pointed at
    *     `Donor7.*`/`Donor9.*` files that have not existed since at least December 2025, and picking
    *     one failed with "Unable to annotate this sample: ... (No such file or directory)".
    *   - the file is there but is not the format it is registered as. A raw AIRR file was added in
    *     July and registered as VDJtools like every other demo sample; vdjtools has no AIRR reader,
    *     so it never loaded once — its row still read -1 reads and -1 clonotypes a month later.
    *
    * The format check has to run here and not only where samples are added, because the row that
    * needed removing was already in the account by the time the check existed.
    *
    * Rows only — see `deleteRowsOnly`. These samples share one directory, and the normal delete path
    * would ask to remove it.
    */
  private def pruneUnusableDemoSampleFiles(demoUser: User): Future[Unit] = async {
    val unusable = await(demoUser.getSampleFilesWithMetadata).collect {
      case (sample, metadata) if !metadata.checkIfExist() =>
        (sample, metadata, "its file is not on disk")
      case (sample, metadata) if SampleConverter.formatOf(new File(metadata.path)) != VdjtoolsFormat =>
        (sample, metadata, s"it reads as ${SampleConverter.formatOf(new File(metadata.path))}, not $VdjtoolsFormat")
    }
    if (unusable.nonEmpty) {
      await(fmp.deleteRowsOnly(unusable.map(_._2)))
      unusable.foreach { case (sample, _, reason) =>
        logger.info(s"Removed demo sample ${sample.sampleName}: $reason")
      }
    }
  }

  /** Adds any demo sample the account is missing, and only those.
    *
    * Seeding used to happen once, inside the "user does not exist yet" branch. That was enough while
    * the database was wiped on every deploy — the demo user was recreated each time and re-seeded
    * with it. Now that it persists, the account survives with whatever files it had when it was
    * created: on production that is a row and an empty directory, so the login page's offer to
    * "browse example samples by selecting Demo" leads to an account with nothing in it.
    *
    * Matching on sample name rather than tracking what was added before: the demo directory is the
    * source of truth, so a file dropped into it later should appear, and one already present must
    * not be added twice.
    */
  private def seedDemoSampleFiles(demoUser: User): Future[Unit] = async {
    val demoFiles = new File(demoUserConfiguration.filesLocation)
    if (demoFiles.exists && demoFiles.isDirectory) {
      await(pruneUnusableDemoSampleFiles(demoUser))
      val present = await(demoUser.getSampleFiles).map(_.sampleName).toSet
      val missing = demoFiles.listFiles
        .filter(_.isFile)
        .filterNot(file => present.contains(FilenameUtils.getBaseName(file.getName)))

      missing.foreach((file) => {
        val name      = FilenameUtils.getBaseName(file.getName)
        val extension = FilenameUtils.getExtension(file.getName)
        // Registered as VDJtools, so it had better be VDJtools. An upload is converted before it is
        // stored; a demo file is placed by hand and taken at its word, and there is no AIRR or MiXCR
        // reader behind `Software` to fall back on -- vdjtools has neither. A raw AIRR file sat in
        // the demo account for over a month on that assumption, loading nothing, its row still
        // reading -1 reads and -1 clonotypes.
        val format = SampleConverter.formatOf(file)
        if (format != VdjtoolsFormat) {
          logger.warn(s"Skipping demo sample file ${file.getName}: it reads as $format, and a demo " +
            s"sample is loaded as $VdjtoolsFormat. Convert it before putting it in the demo directory.")
        } else {
          demoUser.addDemoSampleFile(name, extension, Software.VDJtools.toString, "HomoSapiens", "TRB",
            Software.VDJtools.toString, file).map {
            case Left(_) =>
              logger.info(s"Added demo sample file: $name")
            case Right(error) =>
              logger.warn(s"$error")
          }
        }
      })
    } else {
      // Debug, not warn: every test application starts a UserProvider against a location that does not
      // exist, and one line per application buried the actual test output.
      logger.debug(s"Demo files location ${demoUserConfiguration.filesLocation} is not a directory, no demo samples added")
    }
  }

  if (demoUserConfiguration.enabled) async {
    logger.info("Demo user is enabled")
    val existing = await(get(demoUserConfiguration.login))
    val demoUser = if (existing.isEmpty) {
      await(verifyUser(await(createUser("vdjdb-demo", demoUserConfiguration.login, demoUserConfiguration.password, UserPermissionsProvider.DEMO_ID))))
    } else {
      logger.info("Demo user already created")
      existing
    }

    demoUser match {
      case Some(user) => await(seedDemoSampleFiles(user))
      case None       => logger.info("Failed to create demo user")
    }
  }

  final private val unverifiedDeleteScheduler: Option[Cancellable] = Option(configuration.interval.getSeconds != 0).collect {
    case true =>
      system.scheduler.schedule(configuration.interval.getSeconds seconds, configuration.interval.getSeconds seconds) {
        deleteUnverified onComplete {
          case Failure(ex) =>
            logger.warn("Cannot delete unverified users", ex)
          case _ =>
        }
      }
  }

  lifecycle.addStopHook { () =>
    Future.successful(unverifiedDeleteScheduler.foreach(_.cancel()))
  }

  final private val temporaryDeleteScheduler: Option[Cancellable] = Option(temporaryUserConfiguration.interval.getSeconds != 0).collect {
    case true =>
      system.scheduler.schedule(temporaryUserConfiguration.interval.getSeconds seconds, temporaryUserConfiguration.interval.getSeconds seconds) {
        deleteTemporary onComplete {
          case Failure(ex) =>
            logger.warn("Cannot delete temporary users", ex)
          case _ =>
        }
      }
  }

  lifecycle.addStopHook { () =>
    Future.successful(temporaryDeleteScheduler.foreach(_.cancel()))
  }

  getAll onComplete {
    case Success(users) =>
      users.foreach(user => {
        if (user.folderPath == "<default>") {
          val folderPath = s"${usersConfiguration.uploadLocation}/${user.email}"
          val folder     = new File(folderPath)
          folder.mkdirs()
          db.run(table.filter(_.id === user.id).map(_.folderPath).update(folderPath))
        }
      })
    case Failure(ex) =>
      logger.warn("Cannot initialize default columns in user table after evolutions", ex)
  }

  def getTable: TableQuery[UserTable] = table

  def getAuthTokenSessionName: String = stp.getAuthTokenSessionName

  def getVerificationConfiguration: VerificationTokenConfiguration = configuration

  def getDemoUserConfiguration: DemoUserConfiguration = demoUserConfiguration

  def getVerificationMethod: String = configuration.method

  def getVerificationServer: String = configuration.server

  def isVerificationRequired: Boolean = configuration.required

  def getAll: Future[Seq[User]] = db.run(table.result)

  def get(id: Long): Future[Option[User]] = {
    db.run(table.filter(_.id === id).result.headOption)
  }

  def get(email: String): Future[Option[User]] = {
    db.run(table.filter(_.email === email).result.headOption)
  }

  /** Temporary users keep their access token verbatim in EMAIL (unique) and BCrypt(token) in PASSWORD.
    * NEVER use `get(email)` for token login: it matches ordinary accounts too, which would let anyone
    * authenticate as a registered user just by submitting that user's e-mail address. */
  def getTemporary(token: String): Future[Option[User]] = {
    db.run(table.filter(user => user.email === token && user.isTemporary).result.headOption)
  }

  /** The reaper only runs every `interval`, so an expired token can still resolve to a row. Check the
    * keep window at login too, otherwise expiry is best-effort.
    *
    * Measured from LAST_ACCESSED_ON, not CREATED_ON: on CREATED_ON the window is an absolute lifetime,
    * so an account is destroyed `keep` after signup no matter what its owner is doing — mid-session,
    * with their uploaded samples. Idle time is the thing this is meant to reclaim. */
  def isTemporaryExpired(user: User): Boolean = {
    user.lastAccessedOn.before(TimeUtils.getCreatedAt(temporaryUserConfiguration.keep))
  }

  /** Tokens are generated server-side with a CSPRNG. 26 characters over a 31-symbol alphabet is
    * ~128 bits, so a collision is already vanishingly unlikely — we still re-check against the unique
    * EMAIL column and retry, so a collision can never surface as a 500 or as a shared account. */
  def generateTemporaryToken(attemptsLeft: Int = 5): Future[String] = {
    val token = CommonUtils.secureRandomString(SignupTemporaryForm.TOKEN_LENGTH)
    get(token) flatMap {
      case None                        => Future.successful(token)
      case Some(_) if attemptsLeft > 0 => generateTemporaryToken(attemptsLeft - 1)
      case Some(_)                     => Future.failed(new RuntimeException("Unable to allocate a unique temporary token"))
    }
  }

  def get(ids: Seq[Long]): Future[Seq[User]] = {
    db.run(table.filter(fm => fm.id inSet ids).result)
  }

  def getBySessionToken(sessionToken: String): Future[Option[User]] = {
    stp.get(sessionToken) flatMap {
      case Some(token) => get(token.userID)
      case None        => Future.successful(None)
    }
  }

  def getWithPermissions(email: String): Future[Option[(User, UserPermissions)]] = {
    db.run(table.withPermissions.filter(_._1.email === email).result.headOption)
  }

  /** Every account paired with its permission row, so a caller that has to branch on the permission
    * level (the retention sweeper, which exempts DEMO and UNLIMITED) does it in one query instead of
    * one lookup per user. `User.permissionID` is `private[authorization]`, so the join is the only
    * way to get at it from outside this package. */
  def getAllWithPermissions: Future[Seq[(User, UserPermissions)]] = {
    db.run(table.withPermissions.result)
  }

  /** Expiry is measured from LAST_ACCESSED_ON — see `isTemporaryExpired`; reaping on CREATED_ON
    * deletes an account, and the samples in it, while its owner is still using it. */
  def getTemporaryUsers(expiredOnly: Boolean = false): Future[Seq[User]] = {
    if (!expiredOnly) {
      db.run(table.filter(fm => fm.isTemporary).result)
    } else {
      db.run(table.filter(fm => fm.isTemporary && fm.lastAccessedOn < TimeUtils.getCreatedAt(temporaryUserConfiguration.keep)).result)
    }
  }

  /** Counts only temporary accounts: this backs the per-IP cap on token creation, and counting
    * registered users too would let a handful of ordinary signups behind one NAT lock everybody
    * else on that address out of creating a token. */
  def countForCreateIP(createIP: String): Future[Int] = {
    db.run(table.filter(user => user.createIP === createIP && user.isTemporary).length.result)
  }

  def touch(id: Long): Future[Int] = {
    db.run(table.filter(fm => fm.id === id).map(_.lastAccessedOn).update(TimeUtils.getCurrentTimestamp))
  }

  def delete(id: Long)(implicit sfp: SampleFileProvider): Future[Int] = {
    get(id) flatMap {
      case Some(user) => delete(user)
      case None       => Future.successful(0)
    }
  }

  def delete(user: User)(implicit sfp: SampleFileProvider): Future[Int] = {
    user.delete flatMap { _ =>
      db.run(table.filter(_.id === user.id).delete)
    }
  }

  def deleteUnverified(implicit sfp: SampleFileProvider): Future[Int] = {
    db.run(MTable.getTables)
      .flatMap(
        tables =>
          async {
            if (tables.exists(_.name.name == UserTable.TABLE_NAME)) {
              val currentTimestamp = TimeUtils.getCurrentTimestamp
              val expiredTokens    = await(vtp.getExpired(currentTimestamp))
              val userIDs          = expiredTokens.map(_.userID)
              await(get(userIDs).flatMap(users => {
                users.foreach(user => {
                  user.delete
                })
                deleteByIDS(userIDs).flatMap(_ => {
                  vtp.delete(expiredTokens)
                })
              }))
            } else {
              0
            }
          }
      )
  }

  def deleteTemporary(implicit sfp: SampleFileProvider): Future[Int] = {
    db.run(MTable.getTables)
      .flatMap(
        tables =>
          async {
            if (tables.exists(_.name.name == UserTable.TABLE_NAME)) {
              val expiredTemporaryUsers = await(getTemporaryUsers(expiredOnly = true))
              val userIDs               = expiredTemporaryUsers.map(_.id)
              await(get(userIDs).flatMap(users => {
                users.foreach(user => {
                  user.delete
                })
                deleteByIDS(userIDs)
              }))
            } else {
              0
            }
          }
      )
  }

  def createUser(
    login: String,
    email: String,
    password: String,
    permissionsID: Long    = UserPermissionsProvider.DEFAULT_ID,
    verifyUntil: Timestamp = TimeUtils.getExpiredAt(configuration.keep)
  ): Future[VerificationToken] =
    async {
      val check = await(get(email))
      if (check.nonEmpty) {
        throw new RuntimeException("User already exists")
      }
      val hash       = BCrypt.hashpw(password, BCrypt.gensalt())
      val folderPath = s"${usersConfiguration.uploadLocation}/$email"
      val folder     = new File(folderPath)
      folder.mkdirs()
      val user = User(
        id             = 0,
        login          = login,
        email          = email,
        verified       = false,
        folderPath     = folderPath,
        createIP       = "none",
        isTemporary    = false,
        createdOn      = TimeUtils.getCurrentTimestamp,
        lastAccessedOn = TimeUtils.getCurrentTimestamp,
        hash,
        permissionsID
      )
      val userID: Long = await(insert(user))
      await(vtp.createVerificationToken(userID, verifyUntil))
    }

  def createUser(form: SignupForm): Future[VerificationToken] = {
    createUser(form.login, form.email, form.password)
  }

  def createTemporaryUser(token: String, createIP: String): Future[Option[User]] = async {
    val check = await(get(token))
    if (check.nonEmpty) {
      throw new RuntimeException("User already exists")
    }
    val count = await(countForCreateIP(createIP))
    if (count >= temporaryUserConfiguration.maxForOneIP) {
      // Typed, and carrying the limit, because the only consumer renders it to a person: the message
      // used to be the string "Too much users for one IP", which reached the signup page verbatim.
      throw TooManyTemporaryUsersException(temporaryUserConfiguration.maxForOneIP)
    }
    val hash       = BCrypt.hashpw(token, BCrypt.gensalt())
    val folderPath = s"${usersConfiguration.uploadLocation}/$token"
    val folder     = new File(folderPath)
    folder.mkdirs()
    val user = User(
      id             = 0,
      login          = token,
      email          = token,
      verified       = true,
      folderPath     = folderPath,
      createIP       = createIP,
      isTemporary    = true,
      createdOn      = TimeUtils.getCurrentTimestamp,
      lastAccessedOn = TimeUtils.getCurrentTimestamp,
      hash,
      permissionID = UserPermissionsProvider.TEMPORARY_ID
    )
    val userID: Long = await(insert(user))
    await(get(userID))
  }

  def createTemporaryUser(form: SignupTemporaryForm, createIP: String): Future[Option[User]] = {
    createTemporaryUser(form.token, createIP)
  }

  def verifyUser(token: VerificationToken): Future[Option[User]] = {
    verifyUser(token.token)
  }

  def verifyUser(token: String): Future[Option[User]] = async {
    val verificationToken = await(vtp.get(token))
    if (verificationToken.isEmpty) {
      throw new RuntimeException("Invalid token")
    }
    val success = await(db.run(table.filter(_.id === verificationToken.get.userID).map(_.verified).update(true)))
    if (success == 1) {
      await(
        vtp
          .delete(verificationToken.get)
          .flatMap(_ => {
            get(verificationToken.get.userID)
          })
      )
    } else {
      None
    }
  }

  def updatePassword(user: User, newPassword: String): Future[Int] = {
    val newHash = BCrypt.hashpw(newPassword, BCrypt.gensalt())
    db.run(table.filter(_.id === user.id).map(u => (u.password, u.verified)).update((newHash, true)))
  }

  private def insert(user: User): Future[Long] = {
    db.run(table returning table.map(_.id) += user)
  }

  private def deleteByIDS(ids: Seq[Long]): Future[Int] = {
    db.run(table.filter(fm => fm.id inSet ids).delete)
  }
}

/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.models.authorization.user

import java.io.File
import java.sql.Timestamp
import javax.inject.{Inject, Singleton}

import akka.actor.ActorSystem
import backend.models.authorization.forms.SignupForm
import backend.models.authorization.permissions.{UserPermissions, UserPermissionsProvider}
import backend.models.authorization.tokens.session.SessionTokenProvider
import backend.models.authorization.tokens.verification.{VerificationToken, VerificationTokenConfiguration, VerificationTokenProvider}
import backend.models.files.sample.SampleFileProvider
import backend.utils.{CommonUtils, TimeUtils}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import org.mindrot.jbcrypt.BCrypt
import org.slf4j.LoggerFactory
import play.api.Configuration
import slick.jdbc.meta.MTable

import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}
import scala.language.postfixOps
import scala.concurrent.duration._

@Singleton
class UserProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider,
                             vtp: VerificationTokenProvider, stp: SessionTokenProvider)
                            (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem, upp: UserPermissionsProvider, sfp: SampleFileProvider)
    extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    private final val configuration = conf.get[VerificationTokenConfiguration]("application.auth.verification")
    private final val usersConfiguration = conf.get[UserCreateConfiguration]("application.auth.common")

    import dbConfig.profile.api._

    private final val table = TableQuery[UserTable]

    if (usersConfiguration.createUsers.nonEmpty) {
        logger.info("Initial users: ")
        usersConfiguration.createUsers.foreach(user => async {
            val check = await(get(user._2))
            if (check.isEmpty) {
                logger.info(s"User ${user._2} has been created")
                verifyUser(await(createUser(user._1, user._2, user._3, user._4.toLong)))
            } else {
                logger.info(s"User ${user._2} already created")
            }
        })
    }

    if (configuration.interval.getSeconds != 0) {
        system.scheduler.schedule(configuration.interval.getSeconds seconds, configuration.interval.getSeconds seconds) {
            deleteUnverified onComplete {
                case Failure(ex) =>
                    logger.warn("Cannot delete unverified users", ex)
                case _ =>
            }
        }
    }

    getAll onComplete {
        case Success(users) =>
            users.foreach(user => {
                if (user.folderPath == "<default>") {
                    val folderPath = s"${usersConfiguration.uploadLocation}/${user.email}"
                    val folder = new File(folderPath)
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

    def get(ids: Seq[Long]): Future[Seq[User]] = {
        db.run(table.filter(fm => fm.id inSet ids).result)
    }

    def getBySessionToken(sessionToken: String): Future[Option[User]] = {
        stp.get(sessionToken) flatMap {
            case Some(token) => get(token.userID)
            case None => Future.successful(None)
        }
    }

    def getWithPermissions(email: String): Future[Option[(User, UserPermissions)]] = {
        db.run(table.withPermissions.filter(_._1.email === email).result.headOption)
    }

    def delete(id: Long)(implicit sfp: SampleFileProvider): Future[Int] = {
        get(id) flatMap {
            case Some(user) => delete(user)
            case None => Future.successful(0)
        }
    }

    def delete(user: User)(implicit sfp: SampleFileProvider): Future[Int] = {
        user.delete flatMap { _ =>
            db.run(table.filter(_.id === user.id).delete)
        }
    }

    def deleteUnverified(implicit sfp: SampleFileProvider): Future[Int] = {
        db.run(MTable.getTables).flatMap(tables => async {
            if (tables.exists(_.name.name == UserTable.TABLE_NAME)) {
                val currentTimestamp = TimeUtils.getCurrentTimestamp
                val expiredTokens = await(vtp.getExpired(currentTimestamp))
                val userIDs = expiredTokens.map(_.userID)
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
        })
    }

    def createUser(login: String, email: String, password: String,
                   permissionsID: Long = UserPermissionsProvider.DEFAULT_ID,
                   verifyUntil: Timestamp = TimeUtils.getExpiredAt(configuration.keep)): Future[VerificationToken] =
        async {
            val check = await(get(email))
            if (check.nonEmpty) {
                throw new RuntimeException("User already exists")
            }
            val hash = BCrypt.hashpw(password, BCrypt.gensalt())
            val folderPath = s"${usersConfiguration.uploadLocation}/$email"
            val folder = new File(folderPath)
            folder.mkdirs()
            val user = User(0, login, email, verified = false, folderPath, hash, permissionsID)
            val userID: Long = await(insert(user))
            await(vtp.createVerificationToken(userID, verifyUntil))
        }

    def createUser(form: SignupForm): Future[VerificationToken] = {
        createUser(form.login, form.email, form.password)
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
            await(vtp.delete(verificationToken.get).flatMap(_ => {
                get(verificationToken.get.userID)
            }))
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
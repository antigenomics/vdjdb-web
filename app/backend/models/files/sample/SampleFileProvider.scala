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

package backend.models.files.sample

import java.io.File
import javax.inject.{Inject, Singleton}

import akka.actor.ActorSystem
import backend.models.authorization.user.{User, UserProvider}
import backend.models.files.{FileMetadata, FileMetadataProvider}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class SampleFileProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                                  (implicit ec: ExecutionContext, conf: Configuration, system: ActorSystem, fmp: FileMetadataProvider)
    extends HasDatabaseConfigProvider[JdbcProfile] {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    import dbConfig.profile.api._
    private final val table = TableQuery[SampleFileTable]

    def getTable: TableQuery[SampleFileTable] = table

    def getAll: Future[Seq[SampleFile]] = {
        db.run(table.result)
    }

    def get(id: Long): Future[Option[SampleFile]] = {
        db.run(table.filter(_.id === id).result.headOption)
    }

    def getByUserID(id: Long): Future[Seq[SampleFile]] = {
        db.run(table.filter(_.userID === id).result)
    }

    def getByUserIDAndName(id: Long, name: String): Future[Option[SampleFile]] = {
        db.run(table.filter(_.userID === id).filter(_.sampleName === name).result.headOption)
    }

    def getByUserIDAndNameWithMetadata(id: Long, name: String): Future[Option[(SampleFile, FileMetadata)]] = {
        db.run(table.withMetadata.filter(_._1.userID === id).filter(_._1.sampleName === name).result.headOption)
    }

    def getByUserAndName(user: User, name: String): Future[Option[SampleFile]] = {
        getByUserIDAndName(user.id, name)
    }

    def getByUserAndNameWithMetadata(user: User, name: String): Future[Option[(SampleFile, FileMetadata)]] = {
        db.run(table.withMetadata.filter(_._1.userID === user.id).filter(_._1.sampleName === name).result.headOption)
    }

    def getByUser(user: User): Future[Seq[SampleFile]] = {
        getByUserID(user.id)
    }

    def getByUserIDWithMetadata(id: Long): Future[Seq[(SampleFile, FileMetadata)]] = {
        db.run(table.filter(_.userID === id).withMetadata.result)
    }

    def getByUserWithMetadata(user: User): Future[Seq[(SampleFile, FileMetadata)]] = {
        getByUserIDWithMetadata(user.id)
    }

    def delete(file: SampleFile): Future[Int] = {
        fmp.delete(file.metadataID)
    }

    def deleteForUserID(id: Long, name: String): Future[Int] = {
        getByUserIDAndNameWithMetadata(id, name) flatMap  {
            case Some(file) => fmp.delete(file._2)
            case None => Future.successful(0)
        }
    }

    def deleteForUser(user: User, name: String): Future[Int] = {
        deleteForUserID(user.id, name)
    }

    def deleteAllForUserID(id: Long): Future[Int] = {
        getByUserIDWithMetadata(id) flatMap { files =>
            fmp.delete(files.map(_._2))
        }
    }

    def deleteAllForUser(user: User): Future[Int] = {
        deleteAllForUserID(user.id)
    }

    def insert(sample: SampleFile): Future[Long] = {
        db.run(table returning table.map(_.id) += sample)
    }

    def updateSampleFileInfo(sample: SampleFile, readsCount: Long, clonotypesCount: Long): Future[Int] = {
        db.run(table.filter(_.id === sample.id).map(s => (s.readsCount, s.clonotypesCount)).update((readsCount, clonotypesCount)))
    }

    def updateSampleFileProps(sample: SampleFile, newSampleName: String, newSoftware: String): Future[Int] = {
        db.run(table.filter(_.id === sample.id).map(s => (s.sampleName, s.software)).update((newSampleName, newSoftware)))
    }
}

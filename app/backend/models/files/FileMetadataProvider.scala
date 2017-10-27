/*
 *      Copyright 2017 Bagaev Dmitry
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

package backend.models.files

import javax.inject.{Inject, Singleton}

import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.db.NamedDatabase
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class FileMetadataProvider @Inject()(@NamedDatabase("default") protected val dbConfigProvider: DatabaseConfigProvider)
                            (implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {
    import dbConfig.profile.api._

    def getAll: Future[Seq[FileMetadata]] = {
        db.run(FileMetadataProvider.table.result)
    }

    def get(id: Long): Future[Option[FileMetadata]] = {
        db.run(FileMetadataProvider.table.filter(_.id === id).result.headOption)
    }

    def insert(metadata: FileMetadata): Future[Long] = {
        db.run((FileMetadataProvider.table returning FileMetadataProvider.table.map(_.id)) += metadata)
    }

    def insert(fileName: String, extension: String, folder: String): Future[Long] = {
        insert(FileMetadata(0, fileName, extension, s"$folder/$fileName.$extension", folder))
    }

    def delete(metadata: FileMetadata): Future[Int] = {
        db.run(FileMetadataProvider.table.filter(_.id === metadata.id).delete) andThen { case _ =>
            metadata.deleteFile()
        }
    }

    def delete(metadatas: Seq[FileMetadata]): Future[Int] = {
        val ids = metadatas.map(_.id)
        db.run(FileMetadataProvider.table.filter(fm => fm.id inSet ids).delete) andThen { case _ =>
            metadatas.foreach(_.deleteFile())
        }
    }
}

object FileMetadataProvider {
    private[files] final val table = TableQuery[FileMetadataTable]
}

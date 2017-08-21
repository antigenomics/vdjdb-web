package backend.server.database

import java.io.FileInputStream

import com.antigenomics.vdjdb.VdjdbInstance
import javax.inject.{Inject, Singleton}

import backend.server.wrappers.database.ColumnWrapper
import com.typesafe.config.Config
import play.api.{ConfigLoader, Configuration}

@Singleton
case class Database(database: VdjdbInstance) {
    private var meta: DatabaseMetadata = _

    @Inject
    def this(config: Configuration) {
        this(Database.create(config))
        this.meta = DatabaseMetadata.generate(this.database)
    }

    def getColumns : List[ColumnWrapper] = meta.columns


    //  def initDatabase(config: Configuration): Unit =
    //    synchronizeRead { implicit lock =>
    //      if (database.isEmpty) {
    //
    //      }
    //    }
    //
    //  def getNumberOfRecords: Int =
    //    synchronizeRead { implicit lock =>
    //      database.get().getDbInstance.getRows.size()
    //    }
    //
    //  def getColumns: List[ColumnWrapper] =
    //    synchronizeRead { implicit lock =>
    //      var buffer = ListBuffer[ColumnWrapper]()
    //      database().getDbInstance.getColumns.toList.foreach(column => {
    //        buffer += ColumnWrapper.wrap(column)
    //      })
    //      buffer.toList
    //    }
    //
    //  def update() =
    //    synchronizeReadWrite { implicit lock =>
    //
    //    }
}

object Database {
    def create(config: Configuration): VdjdbInstance = {
        val databaseConfig = config.get[DatabaseConfiguration]("application.database")
        if (databaseConfig.useLocal) {
            val meta = new FileInputStream(databaseConfig.path + "vdjdb.meta.txt")
            val data = new FileInputStream(databaseConfig.path + "vdjdb.txt")
            new VdjdbInstance(meta, data)
        } else {
            new VdjdbInstance()
        }
    }
}

case class DatabaseConfiguration(useLocal: Boolean, path: String)

object DatabaseConfiguration {
    implicit val configLoader: ConfigLoader[DatabaseConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        DatabaseConfiguration(
            useLocal = config.getBoolean("useLocal"),
            path = config.getString("path")
        )
    }
}
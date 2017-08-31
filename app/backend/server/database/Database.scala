package backend.server.database

import java.io.FileInputStream
import java.nio.file.{Files, Paths}
import javax.inject.{Inject, Singleton}

import com.antigenomics.vdjdb.VdjdbInstance
import com.typesafe.scalalogging._
import org.slf4j.LoggerFactory
import play.api.Configuration

@Singleton
case class Database(private final val instance: VdjdbInstance) {
    private final val metadata: DatabaseMetadata = DatabaseMetadata.createFromInstance(instance)

    @Inject
    def this(configuration: Configuration) {
        this(Database.createInstanceFromConfiguration(configuration))
    }

    def getMetadata: DatabaseMetadata = metadata

    def getInstance: VdjdbInstance = instance
}

object Database {

    private def createInstanceFromConfiguration(configuration: Configuration): VdjdbInstance = {
        val databaseConfiguration = configuration.get[DatabaseConfiguration]("application.database")
        if (databaseConfiguration.useLocal) {
            val metaFilePath = databaseConfiguration.path + "vdjdb.meta.txt"
            val dataFilePath = databaseConfiguration.path + "vdjdb.txt"

            if (Files.exists(Paths.get(metaFilePath)) && Files.exists(Paths.get(dataFilePath))) {
                new VdjdbInstance(new FileInputStream(metaFilePath), new FileInputStream(dataFilePath))
            } else {
                val logger = Logger(LoggerFactory.getLogger(this.getClass))
                logger.warn("Local database is missing in '" + databaseConfiguration.path + "'")
                logger.warn("Trying to download database")
                new VdjdbInstance()
            }
        } else {
            new VdjdbInstance()
        }
    }

}
package backend.server.database

import java.io.{File, FileInputStream}
import java.nio.file.{Files, Paths}
import javax.inject.{Inject, Singleton}

import com.antigenomics.vdjdb.{Util, VdjdbInstance}
import com.typesafe.scalalogging._
import org.slf4j.LoggerFactory
import play.api.Configuration

@Singleton
case class Database @Inject() (configuration: Configuration) {
    private final val instance: VdjdbInstance = Database.createInstanceFromConfiguration(configuration)
    private final val metadata: DatabaseMetadata = DatabaseMetadata.createFromInstance(instance)
    private final val databaseLocation: String = Database.getDatabaseLocation(configuration)

    def getMetadata: DatabaseMetadata = metadata

    def getInstance: VdjdbInstance = instance

    def getLocation: String = databaseLocation

    def getSummaryFile: Option[File] = {
        val summaryFile = new File(getLocation + "/" + "vdjdb_summary_embed.html")
        if (summaryFile.exists()) {
            Some(summaryFile)
        } else {
            None
        }
    }
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

    private def getDatabaseLocation(configuration: Configuration): String = {
        val databaseConfiguration = configuration.get[DatabaseConfiguration]("application.database")
        if (databaseConfiguration.useLocal) {
            val metaFilePath = databaseConfiguration.path + "vdjdb.meta.txt"
            val dataFilePath = databaseConfiguration.path + "vdjdb.txt"

            if (Files.exists(Paths.get(metaFilePath)) && Files.exists(Paths.get(dataFilePath))) {
                databaseConfiguration.path
            } else {
                Util.getHOME_DIR
            }
        } else {
            Util.getHOME_DIR
        }
    }

}
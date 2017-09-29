package backend.server.database

import java.io.{File, FileInputStream}
import java.nio.file.{Files, Paths}
import javax.inject.{Inject, Singleton}

import backend.server.database.api.suggestions.{DatabaseColumnSuggestion, DatabaseColumnSuggestionsResponse}
import com.antigenomics.vdjdb.web.EpitopeSuggestionGenerator
import com.antigenomics.vdjdb.{Util, VdjdbInstance}
import com.typesafe.scalalogging._
import org.slf4j.LoggerFactory
import play.api.Configuration

import scala.collection.JavaConverters._
import scala.collection.mutable

@Singleton
case class Database @Inject() (configuration: Configuration) {
    private final val instance: VdjdbInstance = Database.createInstanceFromConfiguration(configuration)
    private final val metadata: DatabaseMetadata = DatabaseMetadata.createFromInstance(instance)
    private final val databaseLocation: String = Database.getDatabaseLocation(configuration)
    private final val suggestions = mutable.HashMap[String, DatabaseColumnSuggestionsResponse]()

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

    def getSuggestions(column: String): Option[DatabaseColumnSuggestionsResponse] = {
        if (suggestions.contains(column)) {
            Some(suggestions(column))
        } else {
            column match {
                case "antigen.epitope" =>
                    suggestions.update(column, DatabaseColumnSuggestionsResponse(EpitopeSuggestionGenerator.generateSuggestions(instance)
                        .asScala.mapValues(_.asScala.map(DatabaseColumnSuggestion.createFromEpitopeSuggestion).toList).toMap))
                    getSuggestions(column)
                case _ => None
            }
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
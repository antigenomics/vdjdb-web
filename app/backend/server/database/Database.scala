package backend.server.database

import java.io.FileInputStream
import javax.inject.{Inject, Singleton}
import com.antigenomics.vdjdb.VdjdbInstance
import play.api.Configuration

@Singleton
case class Database(private final val instance: VdjdbInstance) {
    private final val metadata: DatabaseMetadata = DatabaseMetadata.createFromInstance(instance)

    @Inject
    def this(configuration: Configuration) {
        this(Database.createInstanceFromConfiguration(configuration))
    }

    def getMetadata: DatabaseMetadata = metadata
}

object Database {

    private def createInstanceFromConfiguration(configuration: Configuration) : VdjdbInstance = {
        val databaseConfiguration = configuration.get[DatabaseConfiguration]("application.database")
        if (databaseConfiguration.useLocal) {
            val metaFile = new FileInputStream(databaseConfiguration.path + "vdjdb.meta.txt")
            val dataFile = new FileInputStream(databaseConfiguration.path + "vdjdb.txt")
            new VdjdbInstance(metaFile, dataFile)
        } else {
            new VdjdbInstance()
        }
    }

}
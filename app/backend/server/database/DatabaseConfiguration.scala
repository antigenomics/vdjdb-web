package backend.server.database

import com.typesafe.config.Config
import play.api.ConfigLoader

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

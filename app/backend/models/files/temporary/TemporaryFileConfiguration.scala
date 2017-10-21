package backend.models.files.temporary

import com.typesafe.config.Config
import play.api.ConfigLoader

case class TemporaryFileConfiguration(path: String, keep: Int, interval: Int)

object TemporaryFileConfiguration {
    implicit val temporaryFileConfigurationLoader: ConfigLoader[TemporaryFileConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        TemporaryFileConfiguration(
            path = config.getString("path"),
            keep = config.getInt("keep"),
            interval = config.getInt("interval")
        )
    }
}


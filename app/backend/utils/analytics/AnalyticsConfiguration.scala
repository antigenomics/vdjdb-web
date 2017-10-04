package backend.utils.analytics

import com.typesafe.config.Config
import play.api.ConfigLoader

case class AnalyticsConfiguration(yandexID: String, googleID: String)

object AnalyticsConfiguration {
    implicit val analyticsConfigurationLoader: ConfigLoader[AnalyticsConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        AnalyticsConfiguration(
            yandexID = config.getString("yandexID"),
            googleID = config.getString("googleID")
        )
    }
}

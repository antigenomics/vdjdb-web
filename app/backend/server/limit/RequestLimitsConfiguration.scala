package backend.server.limit

import com.typesafe.config.Config
import play.api.ConfigLoader

case class RequestLimitsConfiguration(maxRequestsCount: Int, countClearInterval: Int, maxRequestsTime: Long, timeClearInterval: Int)

object RequestLimitsConfiguration {
    implicit val configLoader: ConfigLoader[RequestLimitsConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        RequestLimitsConfiguration(
            maxRequestsCount = config.getInt("maxRequestsCount"),
            countClearInterval = config.getInt("countClearInterval"),
            maxRequestsTime = config.getLong("maxRequestsTime"),
            timeClearInterval = config.getInt("timeClearInterval")
        )
    }
}

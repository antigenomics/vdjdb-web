package backend.server.guard

import com.typesafe.config.Config
import play.api.ConfigLoader

case class RequestLimitGuardConfiguration(maxRequestsCount: Int, countClearInterval: Int, maxRequestsTime: Long, timeClearInterval: Int)

object RequestLimitGuardConfiguration {
    implicit val configLoader: ConfigLoader[RequestLimitGuardConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        RequestLimitGuardConfiguration(
            maxRequestsCount = config.getInt("maxRequestsCount"),
            countClearInterval = config.getInt("countClearInterval"),
            maxRequestsTime = config.getLong("maxRequestsTime"),
            timeClearInterval = config.getInt("timeClearInterval")
        )
    }
}

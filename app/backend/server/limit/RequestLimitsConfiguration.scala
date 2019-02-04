/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.server.limit

import java.time.Duration

import com.typesafe.config.Config
import play.api.ConfigLoader

case class RequestLimitsConfiguration(maxRequestsCount: Int, countClearInterval: Duration, maxRequestsTime: Long, timeClearInterval: Duration)

object RequestLimitsConfiguration {
  implicit val configLoader: ConfigLoader[RequestLimitsConfiguration] = (rootConfig: Config, path: String) => {
    val config = rootConfig.getConfig(path)
    RequestLimitsConfiguration(
      maxRequestsCount = config.getInt("maxRequestsCount"),
      countClearInterval = config.getDuration("countClearInterval"),
      maxRequestsTime = config.getLong("maxRequestsTime"),
      timeClearInterval = config.getDuration("timeClearInterval")
    )
  }
}

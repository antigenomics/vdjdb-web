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

package backend.utils.analytics

import com.typesafe.config.Config
import play.api.ConfigLoader

case class AnalyticsConfiguration(enabled: Boolean, yandexID: String, googleID: String)

object AnalyticsConfiguration {
  implicit val analyticsConfigurationLoader: ConfigLoader[AnalyticsConfiguration] = (rootConfig: Config, path: String) => {
    val config = rootConfig.getConfig(path)
    AnalyticsConfiguration(
      enabled = config.getBoolean("enabled"),
      yandexID = config.getString("yandexID"),
      googleID = config.getString("googleID")
    )
  }
}

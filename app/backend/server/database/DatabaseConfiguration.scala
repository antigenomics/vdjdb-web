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

package backend.server.database

import com.typesafe.config.Config
import play.api.ConfigLoader

case class DatabaseConfiguration(useLocal: Boolean, path: String)

object DatabaseConfiguration {
  implicit val databaseConfigurationLoader: ConfigLoader[DatabaseConfiguration] = (rootConfig: Config, path: String) => {
    val config = rootConfig.getConfig(path)
    DatabaseConfiguration(
      useLocal = config.getBoolean("useLocal"),
      path = config.getString("path")
    )
  }
}

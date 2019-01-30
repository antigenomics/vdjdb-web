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

package backend.models.files.temporary

import java.time.Duration

import com.typesafe.config.Config
import play.api.ConfigLoader

case class TemporaryFileConfiguration(path: String, keep: Duration, interval: Duration)

object TemporaryFileConfiguration {
    implicit val temporaryFileConfigurationLoader: ConfigLoader[TemporaryFileConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        TemporaryFileConfiguration(
            path = config.getString("path"),
            keep = config.getDuration("keep"),
            interval = config.getDuration("interval")
        )
    }
}


/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

package backend.models.authorization.user

import com.typesafe.config.Config
import play.api.ConfigLoader

case class UserCreateConfiguration(skip: Boolean, users: Seq[(String, String, String, String)], folder: String)

object UserCreateConfiguration {
    implicit val userCreateConfigurationLoader: ConfigLoader[UserCreateConfiguration] = (rootConfig: Config, path: String) => {
        val config = rootConfig.getConfig(path)
        UserCreateConfiguration(
            skip = config.getBoolean("skip"),
            users = config.getConfigList("create").toArray.map(p => {
                val user = p.asInstanceOf[Config]
                (user.getString("login"), user.getString("email"), user.getString("password"), user.getString("permissionsID"))
            }),
            folder = config.getString("folder")
        )
    }
}

/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import java.io.File
import java.net.InetSocketAddress
import scala.sys.process._
import play.sbt.PlayRunHook

object WebpackServer {
    private final val webpackTask: String = "develop:webpack"

    def apply(base: File): PlayRunHook = {
        object WebpackServerScript extends PlayRunHook {
            val webpackProcess: Process = createWebpackProcess().run()

            override def afterStopped(): Unit = {
                webpackProcess.destroy()
            }

            private def createWebpackProcess(): ProcessBuilder =
                if (System.getProperty("os.name").toUpperCase().contains("WIN"))
                    Process(s"cmd /c npm run $webpackTask", base)
                else
                    Process(s"npm run $webpackTask", base)
        }
        WebpackServerScript
    }
}

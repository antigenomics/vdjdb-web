/*
 *     Copyright 2017 Bagaev Dmitry
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

package backend

import play.api.inject.guice.GuiceApplicationBuilder
import play.api.{Application, Mode}

abstract class BaseTestSpecWithApplication extends BaseTestSpec {
    /** Point the database at the checked-in fixture.
      *
      * Without this, `application.database.path` is "database/", which does not exist in a clean
      * checkout, so `Database` falls through to `new VdjdbInstance()` — and that calls
      * `Util.checkDatabase()`, which downloads the entire VDJdb from the network before a single
      * assertion runs. That is what kept the whole suite out of CI.
      *
      * The fixture is a 2,000 row subset with the same 27 columns as production; see
      * test/resources/database/README.md and SOURCES.md for where it came from and how to rebuild it.
      * Motifs and Structures find no files alongside it and degrade to empty, which is fine — nothing
      * here asserts on them.
      */
    lazy implicit val app: Application = new GuiceApplicationBuilder()
        .configure("application.database.useLocal" -> true,
                   "application.database.path" -> "test/resources/database/")
        .in(Mode.Test)
        .build()
}

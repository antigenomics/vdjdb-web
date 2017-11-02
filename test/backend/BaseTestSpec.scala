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

import org.scalatest.{Assertion, Assertions}

import scala.concurrent.{Await, Future}
import scala.async.Async.{async, await}
import scala.concurrent.duration.Duration

abstract class BaseTestSpec extends org.scalatest.AsyncWordSpec with org.scalatest.Matchers with org.scalatest.OptionValues
    with org.scalatestplus.play.WsScalaTestClient {

    implicit class SeqFutureAssertionsExtension(f: Seq[Future[Assertion]]) {
        def assertAll: Future[Assertion] = f.foldLeft[Future[Assertion]](Future.successful(Assertions.succeed)) {
            case (futureAssertLeft, futureAssertRight) =>
                async {
                    Assertions.assert(await(futureAssertLeft) == Assertions.succeed && await(futureAssertRight) == Assertions.succeed)
                }
        }

        def assertAllAndAwait: Assertion = Await.result(f.assertAll, Duration.Inf)
    }

}

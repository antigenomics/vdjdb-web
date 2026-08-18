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

package backend.server.search

import java.util.concurrent.atomic.{AtomicInteger, AtomicReference}
import java.util.concurrent.{CountDownLatch, TimeUnit}

import akka.actor.ActorSystem
import backend.BaseTestSpec
import backend.actions.UtilsTestTag
import play.api.Configuration
import play.api.inject.DefaultApplicationLifecycle

import scala.concurrent.Future

/** The executor bounds two things that cannot be seen after the fact — how many searches run at
  * once, and how long the caller waits — so the tests hold work open on a latch and look at the
  * executor while it is still running, rather than asserting on the result at the end.
  */
class SearchExecutorSpec extends BaseTestSpec {

  private implicit val system: ActorSystem = ActorSystem("search-executor-spec")

  private def executor(threads: Int, timeoutSeconds: Int, hardDeadlineSeconds: Int = 1800): SearchExecutor =
    new SearchExecutor(Configuration.from(Map(
      "application.database.search.threads" -> threads,
      "application.database.search.timeoutSeconds" -> timeoutSeconds,
      "application.database.search.hardDeadlineSeconds" -> hardDeadlineSeconds)),
      new DefaultApplicationLifecycle)

  "SearchExecutor" should {
    "fail the caller once a search outlives its deadline" taggedAs UtilsTestTag in {
      val subject = executor(threads = 1, timeoutSeconds = 1)
      val release = new CountDownLatch(1)

      val result = subject.run {
        release.await(10, TimeUnit.SECONDS)
        "finished"
      }

      result.failed.map { error =>
        release.countDown()
        error shouldBe a[SearchTimeoutException]
        error.getMessage.toLowerCase should include("too long")
      }
    }

    "return the result of a search that beats its deadline" taggedAs UtilsTestTag in {
      executor(threads = 1, timeoutSeconds = 30).run("finished").map { result =>
        result shouldEqual "finished"
      }
    }

    // The case the reaper exists for. This loop models BranchingEnumerator: pure CPU, never checks
    // the interrupt flag, so nothing cooperative can end it. If the kill does not work the thread
    // runs until the JVM exits and this test times out rather than passing quietly.
    "kill a worker that ignores interruption and outlives the hard deadline" taggedAs UtilsTestTag in {
      val subject = executor(threads = 1, timeoutSeconds = 1, hardDeadlineSeconds = 3)
      val running = new CountDownLatch(1)
      val spinning = new AtomicReference[Thread]()

      subject.run {
        spinning.set(Thread.currentThread())
        running.countDown()
        while (true) { Thread.currentThread().isAlive }
        "never reached"
      }

      running.await(10, TimeUnit.SECONDS)
      val victim = spinning.get()
      victim.isAlive shouldEqual true

      // Hard deadline is 3s; give the reaper room without making the suite slow.
      Future {
        val until = System.currentTimeMillis() + 20000
        while (victim.isAlive && System.currentTimeMillis() < until) Thread.sleep(100)
        victim.isAlive shouldEqual false
      }
    }

    // The point of the bound: a runaway search cannot be interrupted, so the only thing standing
    // between one bad query and an unusable box is how many of them may burn a core at once.
    "never run more searches at once than it was configured for" taggedAs UtilsTestTag in {
      val subject = executor(threads = 2, timeoutSeconds = 30)
      val gate    = new CountDownLatch(1)
      val started = new CountDownLatch(2)
      val active  = new AtomicInteger(0)
      val peak    = new AtomicInteger(0)

      val searches = (1 to 6).map { i =>
        subject.run {
          val now = active.incrementAndGet()
          peak.getAndUpdate((previous: Int) => math.max(previous, now))
          started.countDown()
          gate.await(10, TimeUnit.SECONDS)
          active.decrementAndGet()
          i
        }
      }

      started.await(10, TimeUnit.SECONDS)
      val observed = peak.get()
      gate.countDown()

      Future.sequence(searches).map { results =>
        results should have size 6
        observed should be <= 2
      }
    }
  }
}

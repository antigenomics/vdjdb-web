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

package backend.server.annotations

import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.{ConcurrentLinkedQueue, CountDownLatch, TimeUnit}

import backend.BaseTestSpec
import backend.utils.UtilsTestTag
import play.api.Configuration
import play.api.inject.DefaultApplicationLifecycle

import scala.collection.JavaConverters._
import scala.concurrent.Future

/** The scheduler exists to bound something that cannot be observed after the fact — how much work is
  * in flight at one instant — so every test here holds jobs open on a latch and inspects the
  * scheduler while they are running, rather than asserting on what came out at the end.
  */
class AnnotationsSchedulerSpec extends BaseTestSpec {

  private def scheduler(maxConcurrent: Int, maxQueue: Int, maxPerConnection: Int = 1,
                        enabled: Boolean = true): AnnotationsScheduler =
    new AnnotationsScheduler(Configuration.from(Map(
      "application.annotations.scheduler.enabled" -> enabled,
      "application.annotations.scheduler.maxConcurrent" -> maxConcurrent,
      "application.annotations.scheduler.maxQueue" -> maxQueue,
      "application.annotations.scheduler.maxPerConnection" -> maxPerConnection)),
      new DefaultApplicationLifecycle)

  private def ignorePosition: Int => Unit = _ => ()

  "AnnotationsScheduler" should {
    "never run more jobs at once than it was configured for" taggedAs UtilsTestTag in {
      val subject = scheduler(maxConcurrent = 2, maxQueue = 10)
      val gate    = new CountDownLatch(1)
      val started = new CountDownLatch(2)
      val active  = new AtomicInteger(0)
      val peak    = new AtomicInteger(0)

      val jobs = (1 to 6).map { i =>
        subject.submit(s"connection-$i", ignorePosition) {
          val now = active.incrementAndGet()
          peak.getAndUpdate((previous: Int) => math.max(previous, now))
          started.countDown()
          // Held until every job has been submitted, so "how many ran together" is decided by the
          // scheduler and not by whichever job happened to finish first.
          gate.await(10, TimeUnit.SECONDS)
          active.decrementAndGet()
          i
        }
      }

      started.await(10, TimeUnit.SECONDS) shouldBe true
      gate.countDown()

      Future.sequence(jobs).map { results =>
        results should contain theSameElementsAs (1 to 6)
        peak.get shouldBe 2
      }
    }

    "refuse a second job on a connection that already has one" taggedAs UtilsTestTag in {
      val subject = scheduler(maxConcurrent = 2, maxQueue = 10, maxPerConnection = 1)
      val gate    = new CountDownLatch(1)

      val first  = subject.submit("connection", ignorePosition) { gate.await(10, TimeUnit.SECONDS); 1 }
      val second = subject.submit("connection", ignorePosition) { 2 }
      gate.countDown()

      first.flatMap(_ => second.failed).map { failure =>
        failure shouldBe a[AnnotationsBusyException]
        failure.getMessage shouldEqual subject.AlreadyRunningMessage
      }
    }

    "tell a waiting job its position, and tell it again when the position improves" taggedAs UtilsTestTag in {
      val subject   = scheduler(maxConcurrent = 1, maxQueue = 10)
      val gate      = new CountDownLatch(1)
      val running   = new CountDownLatch(1)
      val positions = new ConcurrentLinkedQueue[Int]()

      val first = subject.submit("a", ignorePosition) {
        running.countDown()
        gate.await(10, TimeUnit.SECONDS)
        1
      }
      running.await(10, TimeUnit.SECONDS) shouldBe true

      val second = subject.submit("b", position => { val _ = positions.add(position) })(2)
      val third  = subject.submit("c", position => { val _ = positions.add(position) })(3)
      gate.countDown()

      Future.sequence(Seq(first, second, third)).map { _ =>
        // 1 and 2 as they queue behind the running job; then 1 again for the third once the second
        // is promoted. Without that second notification a waiting user watches a stale number.
        positions.asScala.toList shouldEqual List(1, 2, 1)
      }
    }

    "refuse a job once the queue is full rather than queue it forever" taggedAs UtilsTestTag in {
      val subject = scheduler(maxConcurrent = 1, maxQueue = 1)
      val gate    = new CountDownLatch(1)
      val running = new CountDownLatch(1)

      val first = subject.submit("a", ignorePosition) {
        running.countDown()
        gate.await(10, TimeUnit.SECONDS)
        1
      }
      running.await(10, TimeUnit.SECONDS) shouldBe true

      val second   = subject.submit("b", ignorePosition)(2)
      val refused  = subject.submit("c", ignorePosition)(3)
      gate.countDown()

      Future.sequence(Seq(first, second)).flatMap(_ => refused.failed).map { failure =>
        failure shouldBe a[AnnotationsBusyException]
        failure.getMessage shouldEqual subject.QueueFullMessage
      }
    }

    "free the slot again once a job fails" taggedAs UtilsTestTag in {
      val subject = scheduler(maxConcurrent = 1, maxQueue = 10)

      val failed = subject.submit[Int]("a", ignorePosition) { throw new RuntimeException("boom") }
      failed.failed.flatMap { _ =>
        // Same connection, which only works if the failure released both the slot and the
        // per-connection reservation. A job that throws is the common case, not the exotic one.
        subject.submit("a", ignorePosition)(7)
      }.map { result =>
        result shouldEqual 7
        subject.state shouldEqual ((0, 0))
      }
    }

    "run everything immediately when it is switched off" taggedAs UtilsTestTag in {
      val subject = scheduler(maxConcurrent = 1, maxQueue = 0, maxPerConnection = 1, enabled = false)
      // Three jobs on one connection: every limit above would refuse these, so completing them all is
      // the only outcome that shows the escape hatch actually bypasses the scheduler.
      Future.sequence((1 to 3).map(i => subject.submit("same", ignorePosition)(i))).map { results =>
        results shouldEqual Seq(1, 2, 3)
      }
    }
  }
}

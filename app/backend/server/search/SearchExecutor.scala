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
import java.util.concurrent.{Executors, ThreadFactory}

import akka.actor.ActorSystem
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.inject.ApplicationLifecycle

import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}

final case class SearchExecutorConfiguration(threads: Int, timeout: FiniteDuration, hardDeadline: FiniteDuration) {
  def describe: String =
    s"threads=$threads, timeout=${timeout.toSeconds}s, hardDeadline=${hardDeadline.toSeconds}s"
}

object SearchExecutorConfiguration {
  final val Root = "application.database.search"

  /** Three of the box's four cores. A database search is single-threaded, unlike an annotation, so
    * this is a straight count of how many searches may be in flight -- and leaving one core means a
    * pathological search on every worker still cannot make the site unreachable. */
  final val DefaultThreads: Int = 3

  /** Generous: a normal Browse search answers in well under a second, and an unpaged one over the
    * whole database in a few. Anything past this is not slow, it is stuck. */
  final val DefaultTimeoutSeconds: Int = 30

  /** When the worker is killed outright — 30 minutes. Far beyond the soft timeout on purpose: by
    * this point the caller has long since been answered, so anything still running is a leaked
    * thread burning a core with nothing waiting on its result. */
  final val DefaultHardDeadlineSeconds: Int = 1800

  /** Every key is read with a default. Production starts with `-Dconfig.file=<server-side file>`,
    * which REPLACES the packaged `application.conf` rather than merging with it, so none of these
    * keys exist on the server until someone edits that file by hand, and a `conf.get` on a missing
    * key crash-loops the application while Guice builds the object graph. */
  def fromConfiguration(conf: Configuration): SearchExecutorConfiguration =
    SearchExecutorConfiguration(
      threads = conf.getOptional[Int](s"$Root.threads").filter(_ > 0).getOrElse(DefaultThreads),
      timeout = conf.getOptional[Int](s"$Root.timeoutSeconds").filter(_ > 0).getOrElse(DefaultTimeoutSeconds).seconds,
      hardDeadline = conf.getOptional[Int](s"$Root.hardDeadlineSeconds").filter(_ > 0)
        .getOrElse(DefaultHardDeadlineSeconds).seconds)
}

/** Raised when a search outlived its timeout. Carries the message shown to the user. */
final case class SearchTimeoutException(message: String) extends RuntimeException(message)

/** Runs database searches off the request thread, on a bounded pool, with a deadline.
  *
  * The problem it addresses, observed in production on 2026-08-19: one Browse search sat inside
  * milib's `BranchingEnumerator` at 100% of a core for hours. The client had long since gone away;
  * nothing noticed and nothing stopped it.
  *
  * What each part actually buys, because it is easy to overstate:
  *
  *  - the '''bounded pool''' is the real protection. `DatabaseAPI.search` used to run the search
  *    inline on a Play `default-dispatcher` thread (`Action.async { Future.successful { ... } }`
  *    evaluates its body eagerly, on the caller), so a runaway consumed a thread that serves every
  *    other request. Confined here, the worst case is `threads` wasted cores instead of a dead site.
  *  - the '''soft timeout''' frees the request and the caller. It does '''not''' free the thread:
  *    vdjmatch exposes no cancellation hook, and `BranchingEnumerator` is a tight CPU loop that
  *    never checks `Thread.interrupt()`, so the worker keeps burning after the caller has gone.
  *  - the '''hard deadline''' is what ends it. Nothing cooperative can, so the reaper stops the
  *    thread outright -- see `kill` for why that is defensible on this particular code path and
  *    would not be on most others. This is the difference between a leaked core until the next
  *    deploy and a leaked core for half an hour.
  *
  * ponytail: the thing that actually prevents the condition is the edit-budget cap in
  * `DatabaseFilters` -- the pool and the reaper are containment for whatever that cap does not
  * foresee. If milib ever grows a cancellation hook, use it in `kill` and drop the reflection.
  */
@Singleton
class SearchExecutor @Inject()(conf: Configuration, lifecycle: ApplicationLifecycle)(implicit as: ActorSystem) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  final val configuration: SearchExecutorConfiguration = SearchExecutorConfiguration.fromConfiguration(conf)

  logger.info(s"Database search executor: ${configuration.describe}")

  final val TimedOutMessage: String =
    "The search took too long and was abandoned. Please make it more specific — fewer allowed mismatches, " +
      "or a narrower query — and try again."

  /** Daemon threads: a wedged search must not hold the JVM open through a shutdown. */
  private final val workers = Executors.newFixedThreadPool(configuration.threads, new ThreadFactory {
    private val counter = new AtomicInteger(0)

    def newThread(runnable: Runnable): Thread = {
      val thread = new Thread(runnable, s"database-search-${counter.incrementAndGet()}")
      thread.setDaemon(true)
      thread
    }
  })

  private final val searchContext: ExecutionContext = ExecutionContext.fromExecutorService(workers)

  lifecycle.addStopHook(() => Future.successful(workers.shutdownNow()))

  /** Runs `work` on a worker thread and fails the returned future with a [[SearchTimeoutException]]
    * if it outlives the soft timeout. A worker still running at the hard deadline is killed.
    * Blocking inside `work` is expected. */
  def run[T](work: => T): Future[T] = {
    implicit val scheduling: ExecutionContext = as.dispatcher

    // Published by the worker as it starts so the reaper below has something to aim at, and cleared
    // on the way out so a thread that finished normally is never a target.
    val worker = new AtomicReference[Thread]()

    val result = Future {
      worker.set(Thread.currentThread())
      try work finally worker.set(null)
    }(searchContext)

    val reaper = as.scheduler.scheduleOnce(configuration.hardDeadline) {
      Option(worker.get()).foreach(kill)
    }
    result.onComplete(_ => reaper.cancel())

    val deadline = akka.pattern.after(configuration.timeout, as.scheduler) {
      logger.warn(s"Search exceeded ${configuration.timeout.toSeconds}s and was abandoned by its caller; " +
        s"the worker keeps running and will be killed after ${configuration.hardDeadline.toSeconds}s if it has not finished")
      Future.failed(SearchTimeoutException(TimedOutMessage))
    }

    Future.firstCompletedOf(Seq(result, deadline))
  }

  /** Last resort for a worker that has ignored its deadline.
    *
    * `interrupt` first, which is free and settles anything parked in an interruptible wait. It will
    * not touch the case this exists for: `BranchingEnumerator` is a tight CPU loop that never checks
    * the flag, so only `Thread.stop` ends it. That is deprecated and genuinely unsafe in general --
    * it raises `ThreadDeath` at an arbitrary bytecode, so any half-updated shared state stays
    * half-updated. It is defensible *here* and nowhere else: a search reads an index that is
    * immutable once loaded and builds a result list nobody is waiting for any more, so the only
    * thing thrown away is garbage. Weighed against a core burning until the next deploy, that trade
    * is worth making.
    *
    * Called reflectively because `-deprecation -Xfatal-warnings` would otherwise fail the build, and
    * because `stop` throws `UnsupportedOperationException` from JDK 20 on -- when this application
    * eventually leaves Java 8 the reaper degrades to "interrupt and log" instead of failing to
    * compile. Nothing else about the class changes.
    */
  private def kill(thread: Thread): Unit = {
    logger.error(s"Search on ${thread.getName} outlived the ${configuration.hardDeadline.toSeconds}s hard deadline " +
      "and is being killed; it was consuming a core with nothing waiting on the result")
    thread.interrupt()
    try {
      classOf[Thread].getMethod("stop").invoke(thread)
      logger.warn(s"Killed runaway search thread ${thread.getName}")
    } catch {
      case error: Throwable =>
        logger.error(s"Could not kill runaway search thread ${thread.getName}; it will hold a core " +
          s"until the process restarts (${error.getClass.getSimpleName})")
    }
  }
}

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

import java.util.concurrent.{Executors, ThreadFactory}
import java.util.concurrent.atomic.AtomicInteger

import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.inject.ApplicationLifecycle

import scala.collection.mutable
import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.util.Try

/** How much annotation work may run at once.
  *
  * Sized against the box rather than picked round: four cores, and the search engine already fans a
  * single annotation out over `Runtime.availableProcessors` threads of its own. Two concurrent jobs
  * therefore ask for roughly eight threads on four cores, which is the most oversubscription worth
  * accepting; the previous behaviour — no limit at all — let N simultaneous users ask for 4N.
  */
final case class AnnotationsSchedulerConfiguration(enabled: Boolean,
                                                   maxConcurrent: Int,
                                                   maxQueue: Int,
                                                   maxPerConnection: Int) {
  def describe: String =
    s"enabled=$enabled, maxConcurrent=$maxConcurrent, maxQueue=$maxQueue, maxPerConnection=$maxPerConnection"
}

object AnnotationsSchedulerConfiguration {
  final val Root = "application.annotations.scheduler"

  final val DefaultMaxConcurrent: Int    = 2
  final val DefaultMaxQueue: Int         = 20
  final val DefaultMaxPerConnection: Int = 1

  /** Every key is read with a default. Production starts with `-Dconfig.file=<server-side file>`,
    * which REPLACES the packaged `application.conf` rather than merging with it, so none of these
    * keys exist on the server until someone edits that file by hand. A `conf.get` on a missing key
    * throws while Guice is building the object graph, which crash-loops the whole application on
    * deploy — that has already happened on this project once. */
  def fromConfiguration(conf: Configuration): AnnotationsSchedulerConfiguration =
    AnnotationsSchedulerConfiguration(
      enabled = conf.getOptional[Boolean](s"$Root.enabled").getOrElse(true),
      maxConcurrent = atLeastOne(conf, s"$Root.maxConcurrent", DefaultMaxConcurrent),
      maxQueue = conf.getOptional[Int](s"$Root.maxQueue").filter(_ >= 0).getOrElse(DefaultMaxQueue),
      maxPerConnection = atLeastOne(conf, s"$Root.maxPerConnection", DefaultMaxPerConnection))

  /** A zero or negative concurrency would wedge every annotation forever rather than fail loudly, so
    * a nonsensical value falls back to the default instead of being honoured. */
  private def atLeastOne(conf: Configuration, path: String, fallback: Int): Int =
    conf.getOptional[Int](path).filter(_ > 0).getOrElse(fallback)
}

/** Raised when a job is turned away rather than queued. Carries the message shown to the user, so the
  * websocket handlers do not each invent their own wording. */
final case class AnnotationsBusyException(message: String) extends RuntimeException(message)

/** Admission control for annotation runs.
  *
  * There was none: every websocket connection that asked for an annotation got one immediately, on
  * the default execution context, and the engine then split the search across every core. Ten
  * simultaneous users meant forty threads on four cores plus ten copies of the working set — the
  * failure mode being that everyone's annotation slows to a crawl at once, with no signal that the
  * server is oversubscribed rather than broken.
  *
  * Jobs beyond `maxConcurrent` wait in a bounded queue and are told their position, which is the
  * difference between "the server is busy" and "the page has hung". Past `maxQueue` they are refused
  * outright: a queue deep enough that nobody's browser tab is still open when their turn arrives is
  * worse than an honest refusal.
  */
@Singleton
class AnnotationsScheduler @Inject()(conf: Configuration, lifecycle: ApplicationLifecycle) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  final val configuration: AnnotationsSchedulerConfiguration =
    AnnotationsSchedulerConfiguration.fromConfiguration(conf)

  logger.info(s"Annotation scheduler: ${configuration.describe}")

  final val AlreadyRunningMessage: String =
    "An annotation is already running in this session. Please wait for it to finish before starting another."

  final val QueueFullMessage: String =
    "The server is busy — too many annotations are already queued. Please try again in a few minutes."

  private final class QueuedJob(val connection: String, val onQueued: Int => Unit, val run: () => Unit)

  private final val lock      = new Object
  private var running         = 0
  private final val queue     = mutable.Queue.empty[QueuedJob]
  private final val inFlight  = mutable.Map.empty[String, Int]

  /** Exactly `maxConcurrent` threads, so the accounting below cannot be the only thing standing
    * between the box and unbounded parallelism. Daemon threads: a stuck annotation must not keep the
    * JVM alive through a shutdown. */
  private final val workers = Executors.newFixedThreadPool(configuration.maxConcurrent, new ThreadFactory {
    private val counter = new AtomicInteger(0)

    def newThread(runnable: Runnable): Thread = {
      val thread = new Thread(runnable, s"annotations-worker-${counter.incrementAndGet()}")
      thread.setDaemon(true)
      thread
    }
  })

  lifecycle.addStopHook(() => Future.successful(workers.shutdownNow()))

  /** Fallback context for the disabled case, so turning the scheduler off restores the old behaviour
    * exactly (unbounded, on the default context) rather than silently serialising everything through
    * the worker pool. */
  private implicit final val fallback: ExecutionContext = ExecutionContext.global

  /** @param connection identifies the websocket connection, for the per-connection limit
    * @param onQueued   called with the job's 1-based queue position when it cannot start immediately,
    *                   and again each time that position improves. Never called for a job that starts
    *                   right away.
    * @param work       run on a worker thread; blocking is expected and is the whole point
    * @return the result, or a failed future carrying an [[AnnotationsBusyException]] if the job was
    *         refused. Refusal is decided before `work` is touched, so nothing is loaded or parsed for
    *         a job that will not run.
    */
  def submit[T](connection: String, onQueued: Int => Unit)(work: => T): Future[T] = {
    if (!configuration.enabled) {
      return Future(work)
    }

    val promise = Promise[T]()

    val rejected = lock.synchronized {
      if (inFlight.getOrElse(connection, 0) >= configuration.maxPerConnection) {
        Some(AlreadyRunningMessage)
      } else if (running >= configuration.maxConcurrent && queue.size >= configuration.maxQueue) {
        Some(QueueFullMessage)
      } else {
        inFlight(connection) = inFlight.getOrElse(connection, 0) + 1
        val job = new QueuedJob(connection, onQueued, () => execute(promise, connection, work))
        if (running < configuration.maxConcurrent) {
          running += 1
          job.run()
        } else {
          queue.enqueue(job)
          // Inside the lock: the position must be the one this job actually holds, and computing it
          // outside would race with a job finishing and renumbering the queue underneath us.
          job.onQueued(queue.size)
        }
        None
      }
    }

    rejected match {
      case Some(message) =>
        logger.info(s"Refused annotation for $connection: $message")
        promise.failure(AnnotationsBusyException(message))
      case None =>
    }

    promise.future
  }

  /** The slot is released before the result is published, so a caller that starts another annotation
    * the moment its first one resolves is not refused by its own job still holding the reservation. */
  private def execute[T](promise: Promise[T], connection: String, work: => T): Unit =
    workers.execute(new Runnable {
      def run(): Unit = {
        val outcome = Try(work)
        finish(connection)
        val _ = promise.complete(outcome)
      }
    })

  /** Releases the slot, starts whatever was next, and renumbers the rest.
    *
    * The renumbering notifications are collected under the lock but delivered outside it: they end in
    * a websocket send, and running arbitrary caller code while holding the lock that every submission
    * needs is how a slow client becomes everyone else's problem.
    */
  private def finish(connection: String): Unit = {
    val notifications = lock.synchronized {
      running -= 1

      val remaining = inFlight.getOrElse(connection, 1) - 1
      if (remaining <= 0) inFlight -= connection else inFlight(connection) = remaining

      if (queue.nonEmpty && running < configuration.maxConcurrent) {
        running += 1
        queue.dequeue().run()
      }

      queue.zipWithIndex.map { case (job, index) => () => job.onQueued(index + 1) }.toList
    }

    // Guarded individually: these end in a websocket send on a connection that may have gone away, and
    // one dead client must not stop the rest of the queue being renumbered — nor, since this runs
    // before the promise is completed, strand the job that just finished.
    notifications.foreach(notify => Try(notify()).failed.foreach(t =>
      logger.warn(s"Could not deliver a queue position: ${t.getMessage}")))
  }

  /** For tests and diagnostics: jobs running now, and jobs waiting. */
  def state: (Int, Int) = lock.synchronized((running, queue.size))
}

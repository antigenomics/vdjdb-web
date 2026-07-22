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

package backend.server.limit

import akka.actor.ActorSystem
import akka.stream.Materializer
import backend.utils.RequestUtils
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.mvc.{Filter, RequestHeader, Result, Results}

import scala.collection.concurrent.TrieMap
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.postfixOps

@Singleton
class RequestLimits @Inject()(configuration: Configuration, actorSystem: ActorSystem)
                             (implicit val mat: Materializer, ec: ExecutionContext) extends Filter {

  private val logger = LoggerFactory.getLogger(this.getClass)
  private val limitConfiguration = configuration.get[RequestLimitsConfiguration]("play.filters.limits")
  // A concurrent map, not mutable.LinkedHashMap: entries are created from the request filter, so on
  // every HTTP request and every websocket connect, on all of Play's request threads at once, while
  // the two schedulers below walk the same map. An unsynchronized map under that pattern can lose
  // entries or spin during a resize, and a ConcurrentModificationException raised inside a scheduled
  // sweep kills that schedule for the rest of the process' life. TrieMap is what the usage counters
  // already use for exactly this access pattern, and it beats a lock here because the common case is
  // a single-key lookup on a request thread rather than a bulk operation. The insertion order the
  // LinkedHashMap maintained was never read, so nothing is given up by the swap.
  //
  // Known ceiling: entries are cleared but never removed, so one IpLimit per distinct client IP is held
  // for the life of the process. Evicting the idle ones was tried and reverted, because it is not safe
  // while callers cache the object: AnnotationsAPI and DatabaseAPI read the IpLimit once at websocket
  // connect and hand that instance to the actor, which then counts against it for the whole connection.
  // Drop the entry out of the map and the actor is left mutating an orphan no sweep can reach, so its
  // counters only ever climb - and a tab left open past one sweep would eventually latch at the limit
  // and stay dead until reloaded. Bounding the map means first making those callers look the limit up
  // by IP on each use instead of holding it, which is a change to files beyond this one.
  private val bucket = TrieMap.empty[String, IpLimit]

  actorSystem.scheduler.schedule(initialDelay = limitConfiguration.countClearInterval.getSeconds seconds,
    interval = limitConfiguration.countClearInterval.getSeconds seconds) {
    var maxCount = 0
    var blocked = 0
    bucket.values.foreach { limit =>
      if (limit.requestCount > maxCount) {
        maxCount = limit.requestCount
      }
      if (limit.requestCount >= limitConfiguration.maxRequestsCount) {
        blocked += 1
      }
      limit.clearCount()
    }
    logger.info(s"Clearing requests count limit [max: $maxCount, blocked: $blocked, interval: ${limitConfiguration.countClearInterval}]")
  }

  actorSystem.scheduler.schedule(initialDelay = limitConfiguration.timeClearInterval.getSeconds seconds,
    interval = limitConfiguration.timeClearInterval.getSeconds seconds) {
    var maxTime = 0L
    var blocked = 0
    bucket.values.foreach((limit) => {
      if (limit.requestTime > maxTime) {
        maxTime = limit.requestTime
      }
      if (limit.requestTime >= limitConfiguration.maxRequestsTime) {
        blocked += 1
      }
      limit.clearTime()
    })
    logger.info(s"Clearing requests time limit [max: $maxTime, blocked: $blocked, interval: ${limitConfiguration.timeClearInterval}]")
  }

  override def apply(nextFilter: (RequestHeader) => Future[Result])(request: RequestHeader): Future[Result] = {
    if (allowConnection(request)) {
      val startTime = System.currentTimeMillis
      nextFilter(request).map { result =>
        val endTime = System.currentTimeMillis
        val requestTime = endTime - startTime

        updateLimits(request, 1, requestTime)
        result.withHeaders("Request-Time" -> requestTime.toString)
      }
    } else {
      Future.successful(Results.Forbidden)
    }
  }

  // Shared with temporary-account signup, so both per-IP limits agree on who the client is.
  def getIp(request: RequestHeader): String = RequestUtils.clientIp(request)

  // Create-on-miss everywhere the bucket is read, rather than the bare `bucket(ip)` two of these
  // paths used: now that idle entries are evicted, an address can be dropped between a caller's
  // allowConnection check and the getLimit or updateLimits that follows it, and a missing key used
  // to throw out of a request. An entry recreated here holds what the evicted one held.
  private def limitFor(ip: String): IpLimit = bucket.getOrElseUpdate(ip, IpLimit(0, 0))

  def getLimit(request: RequestHeader): IpLimit = {
    limitFor(getIp(request))
  }

  def allowConnection(request: RequestHeader): Boolean = {
    allowConnection(limitFor(getIp(request)))
  }

  def allowConnection(limit: IpLimit): Boolean = {
    (limitConfiguration.maxRequestsCount == 0 || limit.requestCount < limitConfiguration.maxRequestsCount) &&
      (limitConfiguration.maxRequestsTime == 0 || limit.requestTime < limitConfiguration.maxRequestsTime)
  }

  def updateLimits(request: RequestHeader, count: Int, time: Long): Unit = {
    updateLimits(limitFor(getIp(request)), count, time)
  }

  // Known ceiling: the two counters inside IpLimit are plain vars, so two requests from the same
  // address that finish at the same instant can still lose one increment. That is a per-entry fix
  // (atomics in IpLimit), and it only ever undercounts by a request — unlike an unsynchronized map,
  // which could drop an entry or break a sweep outright.
  def updateLimits(limit: IpLimit, count: Int, time: Long): Unit = {
    limit.requestCount += count
    limit.requestTime += time
  }
}

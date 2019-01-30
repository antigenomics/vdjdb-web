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
import javax.inject.{Inject, Singleton}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.mvc.{Filter, RequestHeader, Result, Results}

import scala.collection.mutable
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.postfixOps

@Singleton
class RequestLimits @Inject()(configuration: Configuration, actorSystem: ActorSystem)
                             (implicit val mat: Materializer, ec: ExecutionContext) extends Filter {

  private val logger = LoggerFactory.getLogger(this.getClass)
  private val limitConfiguration = configuration.get[RequestLimitsConfiguration]("play.filters.limits")
  private val bucket = mutable.LinkedHashMap.empty[String, IpLimit]

  actorSystem.scheduler.schedule(initialDelay = limitConfiguration.countClearInterval.getSeconds seconds,
    interval = limitConfiguration.countClearInterval.getSeconds seconds) {
    var maxCount = 0
    var blocked = 0
    bucket.values.foreach((limit) => {
      if (limit.requestCount > maxCount) {
        maxCount = limit.requestCount
      }
      if (limit.requestCount >= limitConfiguration.maxRequestsCount) {
        blocked += 1
      }
      limit.clearCount()
    })
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

  def getIp(request: RequestHeader): String = {
    request.headers.get("X-Real-IP").getOrElse(request.remoteAddress)
  }

  def getLimit(request: RequestHeader): IpLimit = {
    bucket(getIp(request))
  }

  def allowConnection(request: RequestHeader): Boolean = {
    val ip = getIp(request)
    val limit = bucket.getOrElseUpdate(ip, op = IpLimit(0, 0))
    allowConnection(limit)
  }

  def allowConnection(limit: IpLimit): Boolean = {
    (limitConfiguration.maxRequestsCount == 0 || limit.requestCount < limitConfiguration.maxRequestsCount) &&
      (limitConfiguration.maxRequestsTime == 0 || limit.requestTime < limitConfiguration.maxRequestsTime)
  }

  def updateLimits(request: RequestHeader, count: Int, time: Long): Unit = {
    val ip = getIp(request)
    val limit = bucket(ip)
    updateLimits(limit, count, time)
  }

  def updateLimits(limit: IpLimit, count: Int, time: Long): Unit = {
    limit.requestCount += count
    limit.requestTime += time
  }
}

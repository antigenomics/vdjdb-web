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

package backend.actors

import akka.actor.{Actor, ActorRef, ActorSystem, PoisonPill}
import backend.server.api.ClientRequest
import backend.server.limit.{IpLimit, RequestLimits}
import org.slf4j.LoggerFactory
import play.api.libs.json._

import scala.util.control.NonFatal

abstract class WebSocketActor(out: ActorRef, limit: IpLimit)(implicit as: ActorSystem, limits: RequestLimits) extends Actor {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  protected def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit

  override def receive: Receive = {
    case request: JsValue =>
      if (limits.allowConnection(limit)) {
        val timeStart: Long = System.currentTimeMillis
        val validation: JsResult[ClientRequest] = request.validate[ClientRequest]
        validation match {
          case clientRequest: JsSuccess[ClientRequest] =>
            val request = clientRequest.get
            request.action match {
              case Some(action) =>
                val webSocketOutActorRef = WebSocketOutActorRef(request.id, action, out)
                action match {
                  case WebSocketOutActorRef.PingAction => webSocketOutActorRef.handshake()
                  case _ =>
                    // Nothing above this caught anything, and an actor that dies mid-request never
                    // answers it: the client's promise resolves on a frame carrying the same action
                    // and id, so an escaped exception left the page waiting for a reply that could no
                    // longer come. Answering with an error frame is what lets it recover -- the search
                    // table already treats a reply without rows as a failure and shows the message.
                    try {
                      handleMessage(webSocketOutActorRef, request.data)
                    } catch {
                      case NonFatal(t) =>
                        logger.error(s"Unhandled error while serving websocket action '$action'", t)
                        webSocketOutActorRef.errorMessage(WebSocketActor.UnhandledErrorMessage)
                    }
                }
              case None =>
            }
          case _: JsError =>
            out ! Json.toJson(WebSocketOutActorRef.InvalidRequestMessage)
        }
        val timeEnd: Long = System.currentTimeMillis
        val timeSpent = timeEnd - timeStart
        limits.updateLimits(limit, 1, timeSpent)
      } else {
        out ! PoisonPill
      }
    case _ =>
      out ! PoisonPill
  }

  def validateData[T](out: WebSocketOutActorRef, data: Option[JsValue], callback: T => Unit)(implicit tr: Reads[T]): Unit = {
    if (data.nonEmpty) {
      val dataValidation: JsResult[T] = data.get.validate[T]
      dataValidation match {
        case success: JsSuccess[T] =>
          callback(success.get)
        case _: JsError =>
          out.errorMessage(WebSocketOutActorRef.InvalidDataRequestMessage)
      }
    } else {
      out.errorMessage(WebSocketOutActorRef.InvalidMissingDataRequestMessage)
    }
  }
}

object WebSocketActor {
  final val UnhandledErrorMessage: String =
    "The request could not be completed. Please check the filters and try again; if it keeps failing, report it on the VDJdb-web issue tracker."
}

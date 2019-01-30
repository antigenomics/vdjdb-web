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

import akka.actor.{ActorRef, PoisonPill}
import play.api.libs.json.{JsObject, Json, Writes}

case class WebSocketOutActorRef(private val id: Int, private val action: String, private val out: ActorRef) {

    def getAction: String = action

    def success[T](message: T, action: String = getAction)(implicit tWrites: Writes[T]): Unit = {
        this.send(message, WebSocketOutActorRef.ResponseStatus.SUCCESS, action)
    }

    def warning[T](message: T, action: String = getAction)(implicit tWrites: Writes[T]): Unit = {
        this.send(message, WebSocketOutActorRef.ResponseStatus.WARNING, action)
    }

    def error[T](message: T, action: String = getAction)(implicit tWrites: Writes[T]): Unit = {
        this.send(message, WebSocketOutActorRef.ResponseStatus.ERROR, action)
    }

    def close(): Unit = {
        out ! PoisonPill
    }

    def successMessage(message: String): Unit = {
        this.message(message, WebSocketOutActorRef.ResponseStatus.SUCCESS)
    }

    def warningMessage(message: String): Unit = {
        this.message(message, WebSocketOutActorRef.ResponseStatus.WARNING)
    }

    def errorMessage(message: String): Unit = {
        this.message(message, WebSocketOutActorRef.ResponseStatus.ERROR)
    }

    def handshake(): Unit = {
        out ! Json.toJson(Json.obj("id" -> id, "action" -> action))
    }

    private def message(message: String, status: String): Unit = {
        out ! Json.toJson(Json.obj("id" -> id, "action" -> action, "status" -> status, "message" -> message))
    }

    private def send[T](message: T, status: String, action: String)(implicit tWrites: Writes[T]): Unit = {
        out ! Json.toJson(Json.obj("id" -> id, "status" -> status, "action" -> action) ++ tWrites.writes(message).as[JsObject])
    }
}

object WebSocketOutActorRef {
    final val PingAction: String = "ping"
    final val InvalidRequestMessage: String = "Invalid request"
    final val InvalidDataRequestMessage: String = "Invalid request, unable to validate data type"
    final val InvalidMissingDataRequestMessage: String = "Invalid request, missing data property"

    object ResponseStatus {
        final val SUCCESS: String = "success"
        final val WARNING: String = "warning"
        final val ERROR: String = "error"
    }
}

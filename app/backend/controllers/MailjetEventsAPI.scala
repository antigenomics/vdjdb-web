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

package backend.controllers

import java.security.MessageDigest

import javax.inject._
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.libs.json.{JsArray, JsValue}
import play.api.mvc._

/** Receives Mailjet's Event API callbacks so the application can tell a delivered message from one
  * that was accepted and then dropped.
  *
  * It could not before, and the gap was not academic. `EmailsService` logs `Sent ...` whenever the
  * SMTP transaction completes, because that is genuinely all it knows: commons-email throws only when
  * the handshake or the DATA command fails. On 2026-07-22 the relay answered 250 to two password-reset
  * messages while the Mailjet account was blocked; both were discarded without reaching anyone, and
  * our logs recorded them as sent. The provider's own API had to be queried by hand to find out.
  *
  * Everything a callback tells us is written to the log and nowhere else. There is no table and no
  * retry: the question this answers is "did that message actually go out", which is a question asked
  * while reading logs.
  */
@Singleton
class MailjetEventsAPI @Inject()(cc: ControllerComponents, conf: Configuration) extends AbstractController(cc) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  /** Mailjet does not sign its callbacks, so the URL itself is the credential: the endpoint is public,
    * unauthenticated and posted to by a third party. Without a secret in the path anyone who guesses
    * the route can write arbitrary lines into our log.
    *
    * Unset means the endpoint does not exist — 404, the same response an unregistered route gives, so
    * a scan cannot distinguish "disabled here" from "no such application". Production replaces
    * `application.conf` wholesale, so this key is absent there until someone adds it, and absent has
    * to mean off rather than open.
    *
    * Read through `hasPath` rather than `Configuration.getOptional`, which is not the null-safe reader
    * its name suggests: it gates on `hasPathOrNull`, so an explicit `eventsToken = null` — the obvious
    * way to write "off" in a hand-edited server config — reaches `getString` and throws
    * `ConfigException.Null`. This is read while Guice builds the object graph, so that would crash-loop
    * the application on boot. `hasPath` is false for a null value, which is the behaviour wanted. */
  private final val expectedToken: Option[String] = {
    val path = "application.mailer.eventsToken"
    if (conf.underlying.hasPath(path)) Option(conf.underlying.getString(path)).map(_.trim).filter(_.nonEmpty)
    else None
  }

  logger.info(s"Mailjet event callbacks: ${if (expectedToken.isDefined) "enabled" else "disabled (application.mailer.eventsToken is not set)"}")

  /** Mailjet posts one object per event, or an array of them when the callback is registered with
    * grouping (`Version = 2`). Both shapes arrive at the same URL, so both are handled here rather
    * than by asking whoever registers the callback to pick one.
    *
    * Always 200 on an accepted token, including for a payload we could not make sense of. Mailjet
    * retries a non-2xx for 24 hours and then disables the callback outright; a malformed event is not
    * worth losing the endpoint over, and it is logged either way. */
  def events(token: String): Action[JsValue] = Action(parse.tolerantJson) { request =>
    expectedToken match {
      case Some(expected) if matches(token, expected) =>
        val body = request.body
        val batch = body match {
          case array: JsArray => array.value.toSeq
          case single         => Seq(single)
        }
        batch.foreach(report)
        Ok("")
      case _ =>
        NotFound("")
    }
  }

  /** Constant-time, so the endpoint cannot be used as an oracle to recover the token a byte at a time.
    * `MessageDigest.isEqual` is the JDK's constant-time array compare. */
  private def matches(offered: String, expected: String): Boolean =
    MessageDigest.isEqual(offered.getBytes("UTF-8"), expected.getBytes("UTF-8"))

  /** The events that mean a message did NOT reach a person. `blocked` is the one that would have caught
    * the incident this endpoint exists for. */
  private final val Failures: Set[String] = Set("bounce", "blocked", "spam")

  private def report(event: JsValue): Unit = {
    val kind    = (event \ "event").asOpt[String].getOrElse("unknown")
    val email   = (event \ "email").asOpt[String].getOrElse("<no address>")
    val message = (event \ "MessageID").toOption.map(_.toString).getOrElse("<no id>")
    // smtp_reply carries the recipient server's own refusal text, which is the part worth reading.
    val detail = Seq("error_related_to", "error", "smtp_reply")
      .flatMap(field => (event \ field).asOpt[String]).filter(_.nonEmpty)

    val line = s"[mailjet] $kind for $email (message $message)" +
      (if (detail.nonEmpty) s": ${detail.mkString(" / ")}" else "")

    if (Failures.contains(kind)) logger.warn(line) else logger.info(line)
  }
}

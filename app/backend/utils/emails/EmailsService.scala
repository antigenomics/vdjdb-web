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

package backend.utils.emails

import javax.inject.Inject
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.libs.mailer.{Email, MailerClient}

import scala.concurrent.{ExecutionContext, Future}

class EmailsService @Inject()(mailerClient: MailerClient, conf: Configuration) {
  private final val logger = LoggerFactory.getLogger(this.getClass)

  // `Future.successful { ... }` evaluated its body on the *calling* thread, so the blocking SMTP
  // handshake ran inline on the Play request thread. A slow or unresponsive relay would then hold a
  // request thread for the whole socket timeout, and enough concurrent signups would starve the pool.
  // `Future { ... }` hands it to the execution context instead.
  def sendVerificationTokenEmail(to: String, link: String)(implicit ec: ExecutionContext): Future[Unit] = Future {
    send(to, "VDJdb account verification", frontend.views.html.authorization.emails.verify(link).body)
  }

  def sendResetTokenEmail(to: String, link: String)(implicit ec: ExecutionContext): Future[Unit] = Future {
    send(to, "VDJdb account reset password", frontend.views.html.authorization.emails.reset(link).body)
  }

  /** Logs the outcome either way.
    *
    * Only failures used to be logged, which makes a silent log ambiguous: it reads identically whether
    * the mail went out or the call was never reached. That ambiguity cost real debugging time, and the
    * caller cannot tell the difference either — every caller wraps this in `Future.successful`, so a
    * failed send still shows the user a success message.
    *
    * `mailerClient.send` returns the provider's message id, which is what to quote to Mailjet support
    * when a message is accepted but never delivered.
    */
  private def send(to: String, subject: String, body: String): Unit = {
    val from = senderAddress
    from match {
      case None =>
        logger.error(s"Not sending '$subject' to $to: play.mailer.from is not configured")
      case Some(sender) =>
        try {
          val messageID = mailerClient.send(Email(subject, sender, Seq(to), bodyHtml = Some(body)))
          // The recipient is kept out of the INFO line: an address in a log nothing rotates is
          // personal data, and the message id is what a support request needs anyway. Which address
          // a given message went to is one DEBUG level away when a delivery has to be traced.
          logger.info(s"Sent '$subject' from $sender (message id: $messageID)")
          logger.debug(s"Sent '$subject' to $to from $sender (message id: $messageID)")
        } catch {
          case e: Exception => logger.error(s"Failed to send '$subject' to $to from $sender: ", e)
        }
    }
  }

  /** `play.mailer.from` ships as `null` and was null in production for years, so "not configured" is
    * the case this has to handle well.
    *
    * `Configuration.getOptional` does not handle it: it gates on `hasPathOrNull`, so a null value is
    * reported as present and then read with `getString`, which throws `ConfigException.Null`. The
    * throw lands inside `send`, so the caller sees a failed future rather than the explicit "from is
    * not configured" line below — the exact diagnosis this method exists to produce. `hasPath` is
    * false for a null, which is the behaviour the name `getOptional` implies but does not have. */
  private def senderAddress: Option[String] = {
    val path = "play.mailer.from"
    if (conf.underlying.hasPath(path)) Option(conf.underlying.getString(path)).map(_.trim).filter(_.nonEmpty)
    else None
  }
}

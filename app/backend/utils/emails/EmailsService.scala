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

  def sendVerificationTokenEmail(to: String, link: String)(implicit ec: ExecutionContext): Future[Unit] = Future.successful {
    send(to, "VDJdb account verification", frontend.views.html.authorization.emails.verify(link).body)
  }

  def sendResetTokenEmail(to: String, link: String)(implicit ec: ExecutionContext): Future[Unit] = Future.successful {
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
    val from = conf.getOptional[String]("play.mailer.from").filter(_.nonEmpty)
    from match {
      case None =>
        // conf.get[String] throws on a null `from`, which would surface as a 500 rather than a mail
        // problem. Say what is actually wrong instead.
        logger.error(s"Not sending '$subject' to $to: play.mailer.from is not configured")
      case Some(sender) =>
        try {
          val messageID = mailerClient.send(Email(subject, sender, Seq(to), bodyHtml = Some(body)))
          logger.info(s"Sent '$subject' to $to from $sender (message id: $messageID)")
        } catch {
          case e: Exception => logger.error(s"Failed to send '$subject' to $to from $sender: ", e)
        }
    }
  }

}

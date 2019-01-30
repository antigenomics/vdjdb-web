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
import play.api.libs.mailer.Email
import play.api.libs.mailer.MailerClient
import play.api.Configuration
import scala.concurrent.{ExecutionContext, Future}

class EmailsService @Inject() (mailerClient: MailerClient, conf: Configuration) {
    private final val logger = LoggerFactory.getLogger(this.getClass)

    def sendVerificationTokenEmail(to: String, link: String)(implicit ec: ExecutionContext): Future[Unit] = Future.successful {
        send(to,"VDJdb account verification", frontend.views.html.authorization.emails.verify(link).body)
    }

    def sendResetTokenEmail(to: String, link: String)(implicit ec: ExecutionContext): Future[Unit] = Future.successful {
        send(to,"VDJdb account reset password", frontend.views.html.authorization.emails.reset(link).body)
    }

    private def send(to: String, subject: String, body: String): Unit = {
        try {
            val email = Email(subject, s"VDJdb <${conf.get[String]("play.mailer.user")}>", Seq(to), bodyHtml = Some(body))
            mailerClient.send(email)
        } catch {
            case e: Exception => logger.error(s"Failed to send an email: ", e)
        }
    }

}

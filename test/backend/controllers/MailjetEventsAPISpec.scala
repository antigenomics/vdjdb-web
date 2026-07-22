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

import com.typesafe.config.ConfigFactory
import play.api.Configuration
import play.api.libs.json.Json
import play.api.mvc.ControllerComponents
import play.api.test.FakeRequest
import play.api.test.Helpers._

class MailjetEventsAPISpec extends ControllersTestSpec {
  private lazy val components: ControllerComponents = app.injector.instanceOf[ControllerComponents]

  /** Built by hand rather than injected: the token has to vary per test, and the application's own
    * configuration ships it unset. */
  private def api(token: Option[String]): MailjetEventsAPI = {
    val config = token
      .map(value => ConfigFactory.parseString(s"""application.mailer.eventsToken = "$value""""))
      .getOrElse(ConfigFactory.empty())
    new MailjetEventsAPI(components, Configuration(config))
  }

  private final val Sent = Json.obj(
    "event" -> "sent", "email" -> "someone@mail.com", "MessageID" -> 1234567890L)

  private final val Blocked = Json.obj(
    "event" -> "blocked", "email" -> "someone@mail.com", "MessageID" -> 1234567890L,
    "error_related_to" -> "recipient", "error" -> "user unknown")

  "MailjetEventsAPI#events" should {

    "404 when no token is configured" taggedAs ControllersTestTag in {
      // Production replaces application.conf wholesale, so the key is absent there until someone adds
      // it. Absent has to mean "closed", not "open to anyone who guesses the route".
      val result = api(None).events("anything").apply(FakeRequest().withBody(Sent))
      status(result) shouldEqual NOT_FOUND
    }

    "404 on a token that does not match" taggedAs ControllersTestTag in {
      val result = api(Some("expected")).events("offered").apply(FakeRequest().withBody(Sent))
      status(result) shouldEqual NOT_FOUND
    }

    "accept a single event object" taggedAs ControllersTestTag in {
      val result = api(Some("secret")).events("secret").apply(FakeRequest().withBody(Sent))
      status(result) shouldEqual OK
    }

    "accept a grouped batch, which is what a Version = 2 callback posts" taggedAs ControllersTestTag in {
      val batch  = Json.arr(Sent, Blocked)
      val result = api(Some("secret")).events("secret").apply(FakeRequest().withBody(batch))
      status(result) shouldEqual OK
    }

    "still answer 200 to a payload it cannot make sense of" taggedAs ControllersTestTag in {
      // Mailjet retries a non-2xx for 24 hours and then disables the callback. Losing the endpoint
      // over one malformed event costs more than the event does.
      val result = api(Some("secret")).events("secret").apply(FakeRequest().withBody(Json.obj("what" -> "?")))
      status(result) shouldEqual OK
    }
  }
}

/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

package backend.actors

import akka.testkit.TestProbe
import org.scalatest.Succeeded
import play.api.libs.json.{Format, JsValue, Json}

class WebSocketActorOutRefSpec extends ActorsTestSpec {
    implicit lazy val probe = TestProbe()

    case class DummyTestDataClass(dummyInt: Int, dummyString: String)
    lazy implicit val dummyTestDataClassFormat: Format[DummyTestDataClass] = Json.format[DummyTestDataClass]

    "WebSocketActorOutRef" should {
        "be able to send simple messages" taggedAs ActorsTestTag in {
            val ref = WebSocketOutActorRef(0, "test", probe.ref)

            ref.getAction shouldEqual "test"
            ref.successMessage("success")
            val success = expectSuccessMessage("test")
            success shouldEqual "success"

            ref.warningMessage("warning")
            val warning = expectWarningMessage("test")
            warning shouldEqual "warning"

            ref.errorMessage("error")
            val error = expectErrorMessage("test")
            error shouldEqual "error"
        }

        "be able to send messages of custom type" taggedAs ActorsTestTag in {
            val ref = WebSocketOutActorRef(0, "test", probe.ref)
            val data = DummyTestDataClass(1, "aaa")

            ref.getAction shouldEqual "test"
            ref.success(data)
            val success = expectSuccessMessageOfType[DummyTestDataClass]("test")
            success shouldEqual data

            ref.warning(data)
            val warning = expectWarningMessageOfType[DummyTestDataClass]("test")
            warning shouldEqual data

            ref.error(data)
            val error = expectErrorMessageOfType[DummyTestDataClass]("test")
            error shouldEqual data
        }

        "be able to handshake" taggedAs ActorsTestTag in {
            val ref = WebSocketOutActorRef(0, "test", probe.ref)
            ref.handshake()
            expectHandshakeMessage("test")
        }

        "pass proper id with messages"  taggedAs ActorsTestTag in {
            for (id <- 1 to 10) {
                val ref = WebSocketOutActorRef(id, s"test${id}", probe.ref)
                ref.successMessage(s"id:${id}")

                val responseJson = probe.expectMsgClass(classOf[JsValue])
                (responseJson \ "id").asOpt[Int] shouldEqual Some(id)
                (responseJson \ "action").asOpt[String] shouldEqual Some(s"test${id}")
                (responseJson \ "status").asOpt[String] shouldEqual Some("success")
                (responseJson \ "message").asOpt[String] shouldEqual Some(s"id:${id}")
            }
            Succeeded
        }
    }
}

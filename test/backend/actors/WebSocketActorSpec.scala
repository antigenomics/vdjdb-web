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

import akka.actor.Props
import akka.testkit.TestProbe
import play.api.libs.json.{Format, JsValue, Json}

import scala.language.postfixOps
import scala.concurrent.duration._

class WebSocketActorSpec extends ActorsTestSpec {
    lazy implicit val timeout = 5 seconds
    lazy implicit val probe = TestProbe()

    case class DummyTestDataClass(dummyInt: Int, dummyString: String)
    lazy implicit val dummyTestDataClassFormat: Format[DummyTestDataClass] = Json.format[DummyTestDataClass]

    lazy implicit val ws = system.actorOf(Props(new WebSocketActor(probe.ref, fakeLimit) {
        override protected def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
            out.getAction match {
                case "test" => out.successMessage("handleMessage")
                case "validate" => validateData(out, data, (data: DummyTestDataClass) => {
                    out.successMessage(s"validated:${data.dummyInt}:${data.dummyString}")
                })
                case _ => out.errorMessage("invalidAction")
            }
        }
    }))

    "WebSocketActor" should {
        "be able to receive proper Json data" taggedAs ActorsTestTag in {
            ws ! Json.obj("id" -> 0, "action" -> "test")
            val message = expectSuccessMessage("test")
            message shouldEqual "handleMessage"
        }

        "be able to handle invalid actions" taggedAs ActorsTestTag in {
            ws ! Json.obj("id" -> 1, "action" -> "invalid")
            val message = expectErrorMessage("invalid")
            message shouldEqual "invalidAction"
        }

        "be able to receive incorrect Json data" taggedAs ActorsTestTag in {
            ws ! Json.obj()
            val responseJson = probe.expectMsgClass(classOf[JsValue])
            val message = responseJson.asOpt[String]
            message should not be empty
            message.get shouldEqual WebSocketOutActorRef.InvalidRequestMessage
        }

        "be able to validate data" taggedAs ActorsTestTag in {
            ws ! Json.obj("id" -> 2, "action" -> "validate", "data" -> Json.obj("dummyInt" -> 1, "dummyString" -> "aaa"))
            val message1 = expectSuccessMessage("validate")
            message1 shouldEqual s"validated:1:aaa"

            ws ! Json.obj("id" -> 2, "action" -> "validate", "data" -> Json.obj("dummyInt" -> "1", "dummyString" -> "aaa"))
            val message2 = expectErrorMessage("validate")
            message2 shouldEqual WebSocketOutActorRef.InvalidDataRequestMessage

            ws ! Json.obj("id" -> 2, "action" -> "validate", "data" -> Json.obj("dummyInt" -> 1, "dummyString" -> 2))
            val message3 = expectErrorMessage("validate")
            message3 shouldEqual WebSocketOutActorRef.InvalidDataRequestMessage

            ws ! Json.obj("id" -> 2, "action" -> "validate")
            val message4 = expectErrorMessage("validate")
            message4 shouldEqual WebSocketOutActorRef.InvalidMissingDataRequestMessage
        }
    }
}

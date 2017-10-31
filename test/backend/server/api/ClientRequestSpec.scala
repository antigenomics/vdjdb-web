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
 */

package backend.server.api

import backend.BaseTestSpec
import play.api.libs.json._

class ClientRequestSpec extends BaseTestSpec {

    "Client request" should {

        "successfully created from JSON request" in {
            val jsonRequest1: JsValue = Json.parse("""
                {
                  "id": 1
                }
            """)

            val clientRequest1 = Json.fromJson[ClientRequest](jsonRequest1)
            clientRequest1 shouldBe a [JsSuccess[_]]
            clientRequest1.get.id shouldEqual 1
            clientRequest1.get.action shouldBe None
            clientRequest1.get.data shouldBe None

            val jsonRequest2: JsValue = Json.parse("""
                {
                  "id": 2,
                  "action": "test"
                }
            """)

            val clientRequest2 = Json.fromJson[ClientRequest](jsonRequest2)
            clientRequest2 shouldBe a [JsSuccess[_]]
            clientRequest2.get.id shouldEqual 2
            clientRequest2.get.action should not be empty
            clientRequest2.get.action.get shouldEqual "test"
            clientRequest2.get.data shouldBe None

            val jsonRequest3: JsValue = Json.parse("""
                {
                  "id": 3,
                  "action": "testtest",
                  "data": {
                    "a": "b"
                  }
                }
            """)

            val clientRequest3 = Json.fromJson[ClientRequest](jsonRequest3)
            clientRequest3 shouldBe a [JsSuccess[_]]
            clientRequest3.get.id shouldEqual 3
            clientRequest3.get.action should not be empty
            clientRequest3.get.action.get shouldEqual "testtest"
            clientRequest3.get.data should not be empty
            (clientRequest3.get.data.get \ "a").as[String] shouldEqual "b"
        }

        "raise an error if request id is missing" in {
            val errorRequest: JsValue = Json.parse("""
                {
                  "action": "a",
                  "data": {
                    "b": "c"
                  }
                }
            """)

            val request = Json.fromJson[ClientRequest](errorRequest)
            request shouldBe a [JsError]
        }

    }

}

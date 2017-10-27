package server.api

import backend.server.api.ClientRequest
import base.BaseTestSpec
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

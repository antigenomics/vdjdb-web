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

import akka.actor.ActorSystem
import akka.testkit.{ImplicitSender, TestKit, TestProbe}
import backend.server.api.ClientRequest
import backend.server.limit.{IpLimit, RequestLimits}
import org.scalatest.{Assertion, Assertions, BeforeAndAfterAll}
import play.api.{Application, Mode}
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.{JsValue, Json, Reads, Writes}

import scala.async.Async.{async, await}
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future}

abstract class ActorsTestSpec extends TestKit(ActorSystem("ActorsTestSpec")) with ImplicitSender
    with org.scalatest.AsyncWordSpecLike with org.scalatest.Matchers with org.scalatest.OptionValues with BeforeAndAfterAll  {
    lazy implicit val app: Application = new GuiceApplicationBuilder().in(Mode.Test).build()
    lazy implicit val ec: ExecutionContext = app.injector.instanceOf[ExecutionContext]
    lazy implicit val limits: RequestLimits = app.injector.instanceOf[RequestLimits]
    lazy implicit val fakeLimit: IpLimit = IpLimit(0, 0)
    lazy implicit val successfull = 'Success

    private var counter: Int = 0
    def createClientRequest[T](action: String, data: Option[T])(implicit dataWrites: Writes[T]): JsValue = {
        counter = counter + 1
        Json.toJson(ClientRequest(counter, Some(action), Some(Json.toJson(data))))
    }

    def expectMessageOfType[T](status: String, action: String)(implicit probe: TestProbe, typeReads: Reads[T]): T = {
        val responseJson = probe.expectMsgClass(classOf[JsValue])
        (responseJson \ "id").asOpt[Int] should not be empty
        (responseJson \ "action").asOpt[String] shouldEqual Some(action)
        (responseJson \ "status").asOpt[String] shouldEqual Some(status)
        val response = Json.fromJson[T](responseJson)
        response shouldBe successfull
        response.get
    }

    def expectSuccessMessageOfType[T](action: String)(implicit probe: TestProbe, typeReads: Reads[T]): T = {
        expectMessageOfType(WebSocketOutActorRef.ResponseStatus.SUCCESS, action)
    }

    def expectWarningMessageOfType[T](action: String)(implicit probe: TestProbe, typeReads: Reads[T]): T = {
        expectMessageOfType(WebSocketOutActorRef.ResponseStatus.WARNING, action)
    }

    def expectErrorMessageOfType[T](action: String)(implicit probe: TestProbe, typeReads: Reads[T]): T = {
        expectMessageOfType(WebSocketOutActorRef.ResponseStatus.ERROR, action)
    }

    def expectMessage(action: String, status: String)(implicit probe: TestProbe): String = {
        val responseJson = probe.expectMsgClass(classOf[JsValue])
        (responseJson \ "id").asOpt[Int] should not be empty
        (responseJson \ "action").asOpt[String] shouldEqual Some(action)
        (responseJson \ "status").asOpt[String] shouldEqual Some(status)
        (responseJson \ "message").asOpt[String] should not be empty
        (responseJson \ "message").as[String]
    }

    def expectSuccessMessage(action: String)(implicit probe: TestProbe): String = {
        expectMessage(action, WebSocketOutActorRef.ResponseStatus.SUCCESS)
    }

    def expectWarningMessage(action: String)(implicit probe: TestProbe): String = {
        expectMessage(action, WebSocketOutActorRef.ResponseStatus.WARNING)
    }

    def expectErrorMessage(action: String)(implicit probe: TestProbe): String = {
        expectMessage(action, WebSocketOutActorRef.ResponseStatus.ERROR)
    }

    def expectHandshakeMessage(action: String)(implicit probe: TestProbe): Assertion = {
        val responseJson = probe.expectMsgClass(classOf[JsValue])
        (responseJson \ "id").asOpt[Int] should not be empty
        (responseJson \ "status").asOpt[String] should be (empty)
        (responseJson \ "action").asOpt[String] shouldEqual Some(action)
    }

    override def afterAll: Unit = {
        TestKit.shutdownActorSystem(system)
    }

    implicit class SeqFutureAssertionsExtension(f: Seq[Future[Assertion]]) {
        def assertAll: Future[Assertion] = f.foldLeft[Future[Assertion]](Future.successful(Assertions.succeed)) {
            case (futureAssertLeft, futureAssertRight) =>
                async {
                    Assertions.assert(await(futureAssertLeft) == Assertions.succeed && await(futureAssertRight) == Assertions.succeed)
                }
        }

        def assertAllAndAwait: Assertion = Await.result(f.assertAll, Duration.Inf)
    }
}

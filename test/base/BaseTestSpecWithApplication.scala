package base

import play.api.{Application, Mode}
import play.api.inject.guice.GuiceApplicationBuilder

class BaseTestSpecWithApplication extends BaseTestSpec {
    lazy implicit val app: Application = new GuiceApplicationBuilder().in(Mode.Test).build()
}

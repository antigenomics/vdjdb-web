import scala.sys.process._
import play.sbt.PlayImport.PlayKeys.playRunHooks

name := """VDJdb-server"""

version := "2.0.1"
scalaVersion := "2.12.4"

resolvers += "Local Maven Repository" at Path.userHome.asFile.toURI.toURL + ".m2/repository"
resolvers += Resolver.sonatypeRepo("releases")

lazy val root = (project in file(".")).enablePlugins(PlayScala, LauncherJarPlugin, SbtWeb)
pipelineStages := Seq(digest)

libraryDependencies ++= Seq(
    "com.antigenomics" % "vdjdb" % "1.1.6",
    "ch.qos.logback" % "logback-classic" % "1.2.3",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.7.2",
    "com.typesafe.play" %% "play-slick" % "3.0.2",
    "com.typesafe.play" %% "play-slick-evolutions" % "3.0.2",
    "com.h2database" % "h2" % "1.4.196",
    "org.scala-lang.modules" %% "scala-async" % "0.9.7",
    "org.mindrot" % "jbcrypt" % "0.3m",
    guice,
    ws,
    filters
)

scalacOptions ++= Seq(
    "–unchecked",
    "-feature",
    "–optimise",
    "-deprecation",
    "-Ywarn-dead-code",
    "-Xfatal-warnings"
)

// Starts: Prevent documentation of API for production bundles
sources in(Compile, doc) := Seq.empty
mappings in (Compile, packageDoc) := Seq.empty
publishArtifact in(Compile, packageDoc) := false
// Ends.

lazy val isWindows = System.getProperty("os.name").toUpperCase().contains("WIN")
lazy val frontendApplicationPath = if (isWindows) "app\\frontend" else "./app/frontend"
lazy val npm: String = if (isWindows) "cmd /c npm " else "npm "

lazy val buildFrontend = taskKey[Unit]("Build frontend application")
buildFrontend := {
    val logger: TaskStreams = streams.value
    logger.log.info("Installing frontend dependencies")
    val install = Process(npm + "install", file(frontendApplicationPath)).run()
    if (install.exitValue != 0) {
        throw new IllegalStateException("Installing fronted dependencies failed!")
    }
    logger.log.info("Frontend dependencies installed successfully")

    logger.log.info("Building frontend bundle")
    val build = Process(npm + "run bundle", file(frontendApplicationPath)).run()
    if (build.exitValue != 0) {
        throw new IllegalStateException("Building frontend bundle failed!")
    }
    logger.log.info("Frontend bundle built successfully")
}

lazy val testFrontend = taskKey[Unit]("Test frontend application")
testFrontend := {
    val logger: TaskStreams = streams.value
    logger.log.info("Testing frontend application")
    val test = Process(npm + "run test:karma:once", file(frontendApplicationPath)).run()
    logger.log.info(s"Test completed (exit code: ${test.exitValue()})")
}

addCommandAlias("buildBackend", "dist")
addCommandAlias("testBackend", "test")

lazy val build = taskKey[Unit]("Build application")
build := {
    ((packageBin in Universal) dependsOn buildFrontend).value
}

// Starts: Webpack server process when running locally and build actions for production bundle
val frontendDirectory = baseDirectory {
    _ / frontendApplicationPath
}
playRunHooks += frontendDirectory.map(WebpackServer(_)).value
// Ends.


// Starts: Test configurations
javaOptions in Test ++= Seq(
    "-Dslick.dbs.default.db.url=jdbc:h2:mem:play;DB_CLOSE_DELAY=-1",
    "-Dslick.dbs.default.profile=slick.jdbc.H2Profile$",
    "-Dslick.dbs.default.db.profile=org.h2.Driver",
    "-Dapplication.temporary.interval=0",
    "-Dlogger.resource=logback.test.xml"
)
libraryDependencies ++= Seq("org.scalatestplus.play" % "scalatestplus-play_2.12" % "3.1.2" % "test")
// Ends.
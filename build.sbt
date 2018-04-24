import scala.sys.process._
import play.sbt.PlayImport.PlayKeys.playRunHooks

name := """VDJdb-web"""

version := "2.2.2"
scalaVersion := "2.12.5"

resolvers += "Local Maven Repository" at Path.userHome.asFile.toURI.toURL + ".m2/repository"
resolvers += Resolver.sonatypeRepo("releases")

lazy val root = (project in file(".")).enablePlugins(PlayScala, LauncherJarPlugin, SbtWeb)
pipelineStages := Seq(digest)

libraryDependencies ++= Seq(
    "com.antigenomics" % "vdjmatch" % "1.2.1-SNAPSHOT.1",
    "ch.qos.logback" % "logback-classic" % "1.2.3",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.8.0",
    "com.typesafe.play" %% "play-slick" % "3.0.3",
    "com.typesafe.play" %% "play-slick-evolutions" % "3.0.3",
    "com.h2database" % "h2" % "1.4.197",
    "org.scala-lang.modules" %% "scala-async" % "0.9.7",
    "org.mindrot" % "jbcrypt" % "0.4",
    "com.typesafe.play" %% "play-mailer" % "6.0.1",
    "com.typesafe.play" %% "play-mailer-guice" % "6.0.1",
    "eu.bitwalker" % "UserAgentUtils" % "1.21",
    "com.typesafe.akka" %% "akka-testkit" % "2.5.11" % Test,
    guice,
    ws,
    filters
)

scalacOptions ++= Seq(
    "-target:jvm-1.8",
    "-encoding", "UTF-8",
    "-unchecked",
    "-deprecation",
    "-Xfuture",
    "-Yno-adapted-args",
    "-Ywarn-dead-code",
    "-Ywarn-numeric-widen",
    "-feature",
    "–optimise",
    "-Xfatal-warnings"
)

// Starts: Prevent documentation of API for production bundles
sources in (Compile, doc) := Seq.empty
mappings in (Compile, packageDoc) := Seq.empty
publishArtifact in(Compile, packageDoc) := false
// Ends.

// Starts: NPM tasks integration with sbt build

lazy val isWindows = System.getProperty("os.name").toUpperCase().contains("WIN")
lazy val frontendApplicationPath = if (isWindows) "app\\frontend" else "./app/frontend"
lazy val npm: String = if (isWindows) "cmd /c npm " else "npm "

def frontendNPMTask(task: String): Unit = {
    println(s"Executing npm task: $task")
    val process = Process(s"$npm$task", file(frontendApplicationPath)).run()
    if (process.exitValue != 0) {
        throw new IllegalStateException(s"npm task '$task' failed")
    }
    println(s"npm task '$task' completed successfully")
}

lazy val frontendCleanDependencies = taskKey[Unit]("Clean frontend dependencies")
frontendCleanDependencies := frontendNPMTask("run clean:node_modules")

lazy val frontendCleanCache = taskKey[Unit]("Clean frontend cache")
frontendCleanCache := frontendNPMTask("run clean:cache")

lazy val frontendCleanBuild = taskKey[Unit]("Clean frontend build")
frontendCleanBuild := frontendNPMTask("run bundle:clean:public")

lazy val frontendInstallDependencies = taskKey[Unit]("Install frontend dependencies")
frontendInstallDependencies := frontendNPMTask("install")

lazy val frontendBuildAngular = taskKey[Unit]("Build angular application")
frontendBuildAngular := frontendNPMTask("run bundle:aot")

lazy val frontendBuildWebpack = taskKey[Unit]("Build webpack assets")
frontendBuildWebpack := frontendNPMTask("run bundle:webpack")

lazy val frontendBuildWebpackDLL = taskKey[Unit]("Build webpack development dlls")
frontendBuildWebpackDLL := frontendNPMTask("run develop:webpack:dll")

lazy val frontendBuild = taskKey[Unit]("Build frontend application")
frontendBuild := frontendNPMTask("run bundle")

lazy val frontendOutdated = taskKey[Unit]("Check frontend dependencies updates")
frontendOutdated := frontendNPMTask("outdated")

// Ends.



addCommandAlias("backendBuild", "dist")
addCommandAlias("backendTest", "test")

lazy val build = taskKey[Unit]("Build application")
build := {
    ((packageBin in Universal) dependsOn frontendBuild).value
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
    "-Dlogger.resource=logback.test.xml",
    "-Dapplication.auth.init.skip=true"
)
libraryDependencies ++= Seq("org.scalatestplus.play" % "scalatestplus-play_2.12" % "3.1.2" % "test")
// Ends.

// Starts: Docker configuration

dockerBaseImage := "anapsix/alpine-java"
dockerEntrypoint := Seq("bin/vdjdb-server", "-Dconfig.file=/environment/application.conf")

// Ends.

import scala.sys.process._
import play.sbt.PlayImport.PlayKeys.playRunHooks

name := """VDJdb-web"""

version := "2.4.23"
scalaVersion := "2.12.8"

val now = System.currentTimeMillis()
val dtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
val currentTime = dtf.format(new java.util.Date(now))
val commitHash = Process("git rev-parse HEAD").!!.stripLineEnd

resolvers += "Local Maven Repository" at Path.userHome.asFile.toURI.toURL + ".m2/repository"
resolvers += Resolver.sonatypeRepo("releases")
resolvers += "jitpack" at "https://jitpack.io"

lazy val root = (project in file("."))
    .enablePlugins(PlayScala, LauncherJarPlugin, SbtWeb, BuildInfoPlugin)
    .settings(buildInfoKeys := Seq[BuildInfoKey](name, version, "builtAt" -> currentTime, "commitHash" -> commitHash))

buildInfoOptions += BuildInfoOption.ToJson

pipelineStages := Seq(digest)

libraryDependencies ++= Seq(
    "com.github.antigenomics" % "vdjmatch" % "1.3.1",
    "ch.qos.logback" % "logback-classic" % "1.2.3",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2",
    "com.typesafe.play" %% "play-slick" % "3.0.3",
    "com.typesafe.play" %% "play-slick-evolutions" % "3.0.3",
    "com.h2database" % "h2" % "1.4.197",
    "org.scala-lang.modules" %% "scala-async" % "0.9.7",
    "org.mindrot" % "jbcrypt" % "0.4",
    "com.typesafe.play" %% "play-mailer" % "6.0.1",
    "com.typesafe.play" %% "play-mailer-guice" % "6.0.1",
    "eu.bitwalker" % "UserAgentUtils" % "1.21",
    "tech.tablesaw" % "tablesaw-core" % "0.30.2",
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

scalacOptions in Universal ++= Seq(
    "-Xdisable-assertions"
)

// Starts: Prevent documentation of API for production bundles
sources in (Compile, doc) := Seq.empty
mappings in (Compile, packageDoc) := Seq.empty
publishArtifact in(Compile, packageDoc) := false
// Ends.

// Starts: Yarn tasks integration with sbt build

lazy val isWindows = System.getProperty("os.name").toUpperCase().contains("WIN")
lazy val frontendApplicationPath = if (isWindows) "app\\frontend" else "./app/frontend"
lazy val yarn: String = if (isWindows) "cmd /c yarn " else "yarn "

def frontendYarnTask(task: String): Unit = {
    println(s"Executing yarn task: $task")
    val process = Process(s"$yarn$task", file(frontendApplicationPath)).run()
    if (process.exitValue != 0) {
        throw new IllegalStateException(s"yarn task '$task' failed")
    }
    println(s"yarn task '$task' completed successfully")
}

lazy val frontendCleanDependencies = taskKey[Unit]("Clean frontend dependencies")
frontendCleanDependencies := frontendYarnTask("run clean:node_modules")

lazy val frontendCleanCache = taskKey[Unit]("Clean frontend cache")
frontendCleanCache := frontendYarnTask("run clean:cache")

lazy val frontendCleanBuild = taskKey[Unit]("Clean frontend build")
frontendCleanBuild := frontendYarnTask("run clean:build")

lazy val frontendInstallDependencies = taskKey[Unit]("Install frontend dependencies")
frontendInstallDependencies := frontendYarnTask("install")

lazy val frontendBuild = taskKey[Unit]("Build frontend application")
frontendBuild := frontendYarnTask("run build")

lazy val frontendOutdated = taskKey[Unit]("Check frontend dependencies updates")
frontendOutdated := frontendYarnTask("outdated")

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
playRunHooks += frontendDirectory.map(AngularServer(_)).value
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

packageName in Docker := "vdjdb-web"
version in Docker := version.value
maintainer in Docker := "bvdmitri"

defaultLinuxInstallLocation in Docker := "/home/vdjdb"

dockerBaseImage := "openjdk:11-stretch"
dockerEntrypoint := Seq("bin/vdjdb-web", "-Dconfig.file=/home/vdjdb/environment/application.conf", "-Dpidfile.path=/dev/null")
dockerExposedPorts := Seq(9000)
dockerExposedVolumes := Seq("/home/vdjdb/environment",
                            "/home/vdjdb/Users/Samples",
                            "/home/vdjdb/demo-dataset",
                            "/home/vdjdb/h2",
                            "/home/vdjdb/vdjdb-db")

dockerUsername := Some("bvdmitri")

// Ends.

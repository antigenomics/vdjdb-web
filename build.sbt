import play.sbt.PlayImport.PlayKeys.playRunHooks

name := """VDJdb"""

version := "1.1.0"

lazy val root = (project in file(".")).enablePlugins(PlayScala, LauncherJarPlugin)

scalaVersion := "2.12.2"

resolvers += "Local Maven Repository" at Path.userHome.asFile.toURI.toURL + ".m2/repository"

libraryDependencies ++= Seq(
    "com.antigenomics" % "vdjdb" % "1.1.6",
    "ch.qos.logback" % "logback-classic" % "1.2.3",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.7.2",
    guice,
    ws,
    filters
)

scalacOptions ++= Seq(
    "–unchecked",
    "-feature",
    "–optimise"
)

// Starts: Prevent documentation of API for production bundles
sources in(Compile, doc) := Seq.empty
publishArtifact in(Compile, packageDoc) := false
// Ends.

lazy val isWindows = System.getProperty("os.name").toUpperCase().contains("WIN")
lazy val buildFrontend = taskKey[Unit]("Build frontend Angular")
val frontendApplicationPath = if (isWindows) "app\\frontend" else "./app/frontend"

buildFrontend := {
    //val install: Seq[String] = shell :+ "npm --prefix " + frontendApplicationPath + " install "
    //val npmTest: Seq[String] = shell :+    "npm run test"
    //val npmLint: Seq[String] = shell :+    "npm run lint"

    val logger: TaskStreams = streams.value
    val npm: String = if (isWindows) "cmd /c npm " else "npm "

    logger.log.info("Installing frontend dependencies")
    val install = Process(npm + "install", file(frontendApplicationPath)).run
    if (install.exitValue != 0) {
        throw new IllegalStateException("Installing fronted dependecies failed!")
    }
    logger.log.info("Frontend dependencies installed successfully")

    logger.log.info("Building frontend bundle")
    val build = Process(npm + "run build", file(frontendApplicationPath)).run
    if (build.exitValue != 0) {
        throw new IllegalStateException("Bulding frontend bundle failed!")
    }
    logger.log.info("Frontend bundle built successfully")
}
(packageBin in Universal) := {
    ((packageBin in Universal) dependsOn buildFrontend).value
}

// Ends.

// Starts: Webpack server process when running locally and build actions for production bundle
val frontendDirectory = baseDirectory {
    _ / frontendApplicationPath
}
playRunHooks += frontendDirectory.map(WebpackServer(_)).value
// Ends.

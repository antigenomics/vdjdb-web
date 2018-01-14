.. _install:

Installing VDJdb server
-----------------------

First make sure that you have installed Java Runtime Environment (JRE) v1.8 by running
``java -version``.  Any recent Linux distribution will provide it via its
package manager.  If not, or if your system is running MacOSX or Windows,
download the JRE from `Oracle <http://java.com/en/download/>`__.

Installing binaries
^^^^^^^^^^^^^^^^^^^

The most straightforward way to install VDJdb as a local server
is to download the `latest release package <https://github.com/antigenomics/vdjdb-web/releases/latest>`__.

After downloading unzip the package wherever you want, but please avoid long paths and spaces (Windows version is especially sensitive to it).

You can find the server executable in ``bin/`` directory. To set up the server:

- Run ``vdjdb-server.bat`` file (Windows)
- Run ``./vdjdb-server`` in your console (Linux/Mac OS)

Wait until the server is started, and go to ``localhost:9000`` URL in your browser to open VDJviz.

To stop application just press `Ctrl-C` at any time in console.

.. note::

	Note that an exception will be thrown in case the ``9000`` port is busy: ``org.jboss.netty.channel.ChannelException: Failed to bind to: /0.0.0.0:9000``.
	In order to fix it, either close the application that is using this port (in UNIX the ``lsof -i:9000``
	will give the processes that are using the port)
	or pass the ``-Dhttp.port=XXXX`` (where ``XXXX`` is new port id) argument to ``vdjviz`` shell script (UNIX) / ``vdjviz.bat`` (Windows)

Compiling from sources
^^^^^^^^^^^^^^^^^^^^^^

Back-end dependencies
"""""""""""""""""""""

* `Maven <https://maven.apache.org/>`__
* `Gradle <https://gradle.org/>`__
* `Scala Build Tools <https://www.scala-sbt.org/>`__

To be able to compile VDJdb web server you should also download and compile the `VDJtools <https://github.com/mikessh/vdjtools>`__
and `VDJdb-standalone <https://github.com/antigenomics/vdjdb-standalone>`__ software using ``mvn clean install`` and ``gradle clean build``
respectively. Please check that the versions of VDJtools and VDJdb-standalone are matched to that in ``build.sbt`` file coming with VDJdb-server.

Front-end dependencies
""""""""""""""""""""""

* `Node.js <https://nodejs.org/en/>`__

Compiling
"""""""""


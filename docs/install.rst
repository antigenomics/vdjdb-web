.. _install:

Installing VDJdb server
-----------------------

First make sure that you have installed Java Runtime Environment (JRE) v1.8 by running
``java -version``.  Any recent Linux distribution will provide it via its
package manager.  If not, or if your system is running MacOSX or Windows,
download the JRE, for example, from `Oracle <http://java.com/en/download/>`__.

Installing binaries
^^^^^^^^^^^^^^^^^^^

The most straightforward way to install VDJdb as a local server
is to download the `latest release package <https://github.com/antigenomics/vdjdb-web/releases/latest>`__.

After downloading unzip the package wherever you want, but please avoid long paths and spaces (Windows version is especially sensitive to it).

You can find the server executable in ``bin/`` directory. To set up the server:

- Run ``vdjdb-web.bat`` file (Windows)
- Run ``./vdjdb-web`` in your console (Linux/Mac OS)

Wait until the server is started, and go to ``localhost:9000`` URL in your browser to open VDJdb.

To stop application just press `Ctrl-C` at any time in console.

.. note::

	Note that an exception will be thrown in case the ``9000`` port is busy: ``org.jboss.netty.channel.ChannelException: Failed to bind to: /0.0.0.0:9000``.
	In order to fix it, either close the application that is using this port (in UNIX the ``lsof -i:9000``
	will give the processes that are using the port)
	or pass the ``-Dhttp.port=XXXX`` (where ``XXXX`` is new port id) argument to ``vdjdb-web`` shell script (UNIX) / ``vdjdb-web.bat`` (Windows)

Compiling from sources
^^^^^^^^^^^^^^^^^^^^^^

Back-end dependencies
"""""""""""""""""""""

* `VDJtools <https://github.com/mikessh/vdjtools>`__
* `VDJmatch <https://github.com/antigenomics/vdjmatch>`__
* `Scala Build Tools <https://www.scala-sbt.org/>`__

Please check that the versions of VDJtools and VDJmatch are matched to that in ``build.sbt`` file coming with VDJdb-server.

Front-end dependencies
""""""""""""""""""""""

* `Node.js 11 and NPM 6 <https://nodejs.org/en/>`__
* `Yarn 1.22 <https://yarnpkg.com/lang/en/>`__

Compiling
"""""""""

VDJdb could be compiled from source using `Scala Build Tools (SBT) <https://www.scala-sbt.org/>`__.
Compilation should be performed under JRE v1.8 by running the following commands:

.. code-block:: console

    $ git clone https://github.com/antigenomics/vdjdb-web.git
    $ cd vdjdb-web/
    $ sbt
    [VDJdb-server] $ frontendInstallDependencies
    [VDJdb-server] $ build

Binaries could then be found under the ``target/universal/vdjdb-server-X.Y.Z.zip`` package.

SBT console commands
""""""""""""""""""""

SBT console supports some utility functions which can be executed in the following way.

.. code-block:: console

   $ sbt
   $ [VDJdb-server] $ command1
   $ [VDJdb-server] $ command2

Available commands:

+--------------------------------------+-----------------------------------------+
| Command                              | Description                             |
+======================================+=========================================+
| build                                | Build VDJdb application                 |
+--------------------------------------+-----------------------------------------+
| backendBuild                         | Build VDJdb backend only                |
+--------------------------------------+-----------------------------------------+
| backendTest                          | Test VDJdb backend                      |
+--------------------------------------+-----------------------------------------+
| frontendBuild                        | Build VDJdb frontend bundle only        |
+--------------------------------------+-----------------------------------------+
| frontendCleanDependencies            | Clean frontend dependencies             |
+--------------------------------------+-----------------------------------------+
| frontendCleanBuild                   | Clean frontend build                    |
+--------------------------------------+-----------------------------------------+
| frontendInstallDependencies          | Install frontend dependencies           |
+--------------------------------------+-----------------------------------------+
| frontendOutdated                     | Check frontend dependencies updates     |
+--------------------------------------+-----------------------------------------+

.. warning::

   Note that after ``frontendCleanDependencies`` command will be executed other commands with ``frontend`` prefix (excluding ``frontendInstallDependencies``) will be unavailable.

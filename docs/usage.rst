.. usage:

Usage
-----

Command line usage
^^^^^^^^^^^^^^^^^^

General way to run VDJdb server would be the following:

.. code-block:: console

   $ ./vdjdb-server -Darg1=value1 -Darg2=value2 ...etc

.. note::

   If you want to change JRE arguments use ``-J-`` prefix.
   For example, to change memory heap size for Java Virtual Machine run the following command in your console:

   .. code-block:: console

      $ ./vdjdb-server -J-Xmx16G

   If insufficient amount memory is allocated, the Java Virtual Machine
   could drop with a *Java Heap Space Out of Memory* error.

Advanced configuration
^^^^^^^^^^^^^^^^^^^^^^

VDJdb server configuration can be performed by passing additional arguments to ``vdjdb-server`` script with ``-D`` prefix in console
or by manually editing application.conf file in the ``conf/`` directory.

List of all available arguments can be found in ``conf/application.conf`` file.

Play framework uses the `HOCON <https://github.com/lightbend/config/blob/master/HOCON.md#hocon-human-optimized-config-object-notation>`__ syntax for configuration.

More about HOCON syntax, data types and other features can be found `here <https://www.playframework.com/documentation/2.6.x/ConfigFile>`__.

VDJdb Database configuration
""""""""""""""""""""""""""""

+--------------------------------------+------------+---------------+-----------------------------------------------------------------------------------------------+
| Argument                             | Type       | Default       | Description                                                                                   |
+======================================+============+===============+===============================================================================================+
| **application.database.useLocal**    | Boolean    | true          | Specify if use local vdjdb-database or try to download latest release from github repository  |
+--------------------------------------+------------+---------------+-----------------------------------------------------------------------------------------------+
| **application.database.path**        | String     | database/     | Specify path to local vdjdb-database relative to ``vdjdb-server`` binary executable           |
+--------------------------------------+------------+---------------+-----------------------------------------------------------------------------------------------+

Example:

.. code-block:: console

   // For local database
   $ ./vdjdb-server -Dapplication.database.useLocal=true -Dapplication.database.path=path/to/local/database/

   // Automatic download latest release from github repository
   $ ./vdjdb-server -Dapplication.database.useLocal=false


Temporary files configuration
"""""""""""""""""""""""""""""

VDJdb server can create some temporary files during execution.

+--------------------------------------+------------+------------------------+----------------------------------------------------------------+
| Argument                             | Type       | Default                | Description                                                    |
+======================================+============+========================+================================================================+
| **application.temporary.path**       | String     | /tmp/vdjdb-temporary   | Path to store temporary files                                  |
+--------------------------------------+------------+------------------------+----------------------------------------------------------------+
| **application.temporary.keep**       | Duration   | 12 hours               | Specify the time during which the file is guaranteed to exist  |
+--------------------------------------+------------+------------------------+----------------------------------------------------------------+
| **application.temporary.interval**   | Duration   | 12 hours               | Specify an interval for deleting expired temporary files       |
+--------------------------------------+------------+------------------------+----------------------------------------------------------------+

Example:

.. code-block:: console

   $ ./vdjdb-server -Dapplication.temporary.path=/tmp -Dapplication.temporary.interval=30minutes -Dapplication.temporary.keep=1hour


Autorization configuration
""""""""""""""""""""""""""

Common configuration:

+----------------------------------------------------+-------------+---------------------------------+----------------------------------------------------+
| Argument                                           | Type        | Default                         | Description                                        |
+====================================================+=============+=================================+====================================================+
| **application.auth.verification.uploadLocation**   | Boolean     | true                            | Is verification required or not                    |
+----------------------------------------------------+-------------+---------------------------------+----------------------------------------------------+
| **application.auth.verification.createUsers**      | User Array  | .. code-block:: json            | | Create default users with application startup    |
|                                                    |             |                                 | | **Note:** This field can't be passed as command  |
|                                                    |             |    [{                           | | line argument. Use ``application.conf`` file     |
|                                                    |             |       "login": "test",          | | instead.                                         |
|                                                    |             |       "email": "test@mail.com", |                                                    |
|                                                    |             |       "password": "123456",     |                                                    |
|                                                    |             |       "permissionsID": "1",     |                                                    |
|                                                    |             |    }]                           |                                                    |
+----------------------------------------------------+-------------+---------------------------------+----------------------------------------------------+

Verification token configuration:

+--------------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| Argument                                         | Type       | Default                | Description                                                        |
+==================================================+============+========================+====================================================================+
| **application.auth.verification.required**       | Boolean    | true                   | Is verification required or not                                    |
+--------------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| **application.auth.verification.method**         | String     | console                | Verification method (console or email)                             |
+--------------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| **application.auth.verification.keep**           | Duration   | 24 hours               | Specify the time during which the token is guaranteed to be valid  |
+--------------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| **application.auth.verification.interval**       | Duration   | 24 hours               | Specify an interval for deleting expired tokens                    |
+--------------------------------------------------+------------+------------------------+--------------------------------------------------------------------+

Example

.. code-block:: console

   //Disable verfication
   $ ./vdjdb-server -Dapplication.auth.verification.required=false


Session token configuration:

+---------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| Argument                                    | Type       | Default                | Description                                                        |
+=============================================+============+========================+====================================================================+
| **application.auth.session.keep**           | Duration   | 30 days                | Specify the time during which the token is guaranteed to be valid  |
+---------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| **application.auth.session.interval**       | Duration   | 1 day                  | Specify an interval for deleting expired tokens                    |
+---------------------------------------------+------------+------------------------+--------------------------------------------------------------------+

Reset token configuration:

+---------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| Argument                                    | Type       | Default                | Description                                                        |
+=============================================+============+========================+====================================================================+
| **application.auth.reset.keep**             | Duration   | 24 hours               | Specify the time during which the token is guaranteed to be valid  |
+---------------------------------------------+------------+------------------------+--------------------------------------------------------------------+
| **application.auth.reset.interval**         | Duration   | 24 hours               | Specify an interval for deleting expired tokens                    |
+---------------------------------------------+------------+------------------------+--------------------------------------------------------------------+

SQL Database configuration
""""""""""""""""""""""""""

VDJdb server uses `Slick API <http://slick.lightbend.com/>`__ for accessing and storing data in SQL database.

.. important::
	Standalone version uses `H2 Database <http://www.h2database.com/html/main.html>`__ for handling metadata by default,
	if you want to change H2 to another DBMS please see the corresponding `Play documentation section <https://www.playframework.com/documentation/2.6.x/ScalaDatabase>`__.
	You can also use this database to manually modify user limits.

It is safe to change default database location with ``slick.dbs.default.db.url`` argument.

Example:

.. code-block:: console

   // Change '/path/to/sql/database'
   $ ./vdjdb-server -Dslick.dbs.default.db.url=jdbc:h2:file:/path/to/sql/database;DB_CLOSE_DELAY=-1



The remaining ``slick.dbs.default.*`` arguments are best kept to the default settings.

More information about Slick API configuration arguments can be found `here <https://www.playframework.com/documentation/2.6.x/PlaySlick>`__.
.. _api:

VDJdb server API
----------------

Accessing metadata
^^^^^^^^^^^^^^^^^^

General information on database metadata (such as column IDs, names, etc..) can be obtained by performing a GET request to ``/api/database/meta``.

**HTTP Request**

``GET /api/database/meta``

**Example**

.. code-block:: bash

   $ curl -X GET https://vdjdb.cdr3.net/api/database/meta

The above command returns JSON structured like this:

.. code-block:: javascript

    {
        "metadata": {
            "numberOfRecords": Number,
            "numberOfColumns": Number,
            "columns":         Array[ColumnInfo]
        }
    }

where ``ColumnInfo`` structured like this:

.. code-block:: javascript

    {
        "name":         String,       // Column's name
        "columnType":   String,       // 'txt' or 'seq'
        "visible":      Boolean,      // Should be always true
        "dataType":     String,       // Internal data type
        "title":        String,       // Formatted name
        "comment":      String,       // Column's description
        "values":       Array[String] // An array of all possible values
    }

Accessing specific column info
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**HTTP Request**

``GET /api/database/meta/columns/:column``

.. note::

   You must replace ``:column`` with the correct column's name.

**Example**

.. code-block:: bash

   $ curl -X GET https://vdjdb.cdr3.net/api/database/meta/columns/gene

The above command returns the following JSON structure:

.. code-block:: javascript

    {
        "column": {
            "name":       "gene",
            "columnType": "txt",
            "visible":    true,
            "dataType":   "factor",
            "title":      "Gene",
            "comment":    "TCR chain: alpha or beta.",
            "values":     [ "TRA", "TRB" ]
        }
    }


Querying the database
^^^^^^^^^^^^^^^^^^^^^

You can query the database by sending a POST request with a specific JSON content

**HTTP Request**

``POST /api/database/search``

**Request parameters**

Request JSON structure:

.. code-block:: javascript

    {
        "filters":   Array[Filter],
        "page":      Optional[Number],      // Optional: page, if not specified server will return all filtered rows from database
        "pageSize":  Optional[Number],      // Optional: page size, used only if ``page`` is specified. Default: 25
        "sort":      Optional[String],      // Optional: sort rule, it has the following structure: "<columnName>:<sortType>".
                                            //           Available sort types: 'asc' - asceding order, 'desc' - descending order
                                            //           Example: "gene:asc"
    }

``Filter`` structure:

.. code-block:: javascript

    {
        "column":     String,               // Column's name
        "filterType": FilterType,           // Filter type (list of all available types will be described below)
        "negative":   Boolean,              // Invert the filter: return only results that do **NOT** match the filter
        "value":      String                // Filter's value
    }

``FilterType`` available options:

.. code-block:: javascript

        "exact"         // Exact match
        "exact:set"     // Comma separated values, exact match for at least one value.
        "substring:set" // Comma separated values, substring match for at least one value.
        "pattern"       // Pattern match
        "level"         // Number, greater or equal than **value**
        "range"         // Range for numbers, it has the following structure "<min>:<max>". Example: "5:10"
        "sequence"      // Fuzzy match filter, it has the following structure "<query>:<substitutions>:<insertions>:<deletions>"
                        // Note that sequence filter can be only applied to column with 'seq' columnType.
                        // Example: "CASSFGVNSDYTF:1:1:1"

**Example**

.. code-block:: bash

   $ curl https://vdjdb.cdr3.net/api/database/search    \
      -H "Content-Type: application/json"               \
      -X POST                                           \
      -d '{ "filters" : [{ "column" : "cdr3", "value" : "CAAAASGGSYIPTF", "filterType" : "exact", "negative" : false }] }'

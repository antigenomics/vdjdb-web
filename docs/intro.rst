.. intro:

Introduction
------------

Overview
^^^^^^^^

VDJdb is a curated database of T-cell receptor (TCR) sequences with known antigen specificities.
The primary goal of VDJdb is to facilitate access to existing information on T-cell receptor antigen specificities,
i.e. the ability to recognize certain epitopes in a certain MHC contexts.

Our mission is to both aggregate the scarce TCR specificity information available so far and to create a curated repository to store such data.
In addition to routine database updates providing the most up-to-date information fetched from recently published studies utilizing TCR specificity assays,
we make our best to ensure data consistency and correct irregularities in TCR specificity reporting with a complex database validation scheme:

* We take into account all available information on experimental setup used to identify antigen-specific TCR sequences and assign a single confidence score to highligh most reliable records at the database generation stage.
* Each database record is also automatically checked against a database of V/J segment germline sequences to ensure standardized and consistent reporting of V-J junctions and CDR3 sequences that define T-cell clones.

.. note::

   This software is intended for advanced users.
   We recommend using either the `VDJdb web portal <https://vdjdb.cdr3.net/>`__
   or the standalone VDJdb application with command line interface that can be found `here <https://github.com/antigenomics/vdjdb-standalone>`__.

See the :ref:`install` section for more details.

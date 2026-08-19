/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.server.structures

import backend.server.structures.api._
import backend.BaseTestSpec
import backend.utils.UtilsTestTag
import tech.tablesaw.api.{StringColumn, Table}

import scala.collection.JavaConverters._

class StructureCdr3SearchSpec extends BaseTestSpec {

  private def table(rows: Seq[(String, String, String)]): Table =
    Table.create("structures",
      StringColumn.create("structure.id", rows.map(_._1).asJava),
      StringColumn.create("cdr3", rows.map(_._2).asJava),
      StringColumn.create("gene", rows.map(_._3).asJava))

  private def cluster(id: String, size: Int): StructureCluster =
    StructureCluster(clusterId = id, displayId = id, tcrPairLabel = "", size = size, length = 0,
      vsegm = "", jsegm = "",
      meta = StructureClusterMeta("", "", "", "", "", "", "", ""), visualization = None)

  private def candidate(id: String, score: Double, normalized: Double = 0.0): StructureCdr3Search.Candidate =
    StructureCdr3Search.Candidate(cluster(id, 1), score, normalized, "PATTERN", None)

  "StructureCdr3Search.resultLimit" should {

    "read a non-positive request as the maximum, not as none" taggedAs UtilsTestTag in {
      StructureCdr3Search.resultLimit(0) shouldEqual StructureCdr3Search.MaxResults
      StructureCdr3Search.resultLimit(-5) shouldEqual StructureCdr3Search.MaxResults
    }

    "cap anything larger, and pass through what fits" taggedAs UtilsTestTag in {
      // Each result costs a cluster build - a table scan plus a filesystem stat.
      StructureCdr3Search.resultLimit(9999) shouldEqual StructureCdr3Search.MaxResults
      StructureCdr3Search.resultLimit(5) shouldEqual 5
      StructureCdr3Search.resultLimit(1) shouldEqual 1
    }
  }

  "StructureCdr3Search.filterByGene" should {

    "narrow on a real chain and pass everything else through" taggedAs UtilsTestTag in {
      val source = table(Seq(("a", "CASSF", "TRA"), ("b", "CASSF", "TRB"), ("c", "CASSF", "TRB")))

      StructureCdr3Search.filterByGene(source, "TRA").rowCount() shouldEqual 1
      StructureCdr3Search.filterByGene(source, "TRB").rowCount() shouldEqual 2
      // An unrecognised gene widens the search rather than emptying it.
      StructureCdr3Search.filterByGene(source, "BOTH").rowCount() shouldEqual 3
      StructureCdr3Search.filterByGene(source, "nonsense").rowCount() shouldEqual 3
    }
  }

  "StructureCdr3Search.normalizeGene" should {

    "upper-case, and treat blank or null as both chains" taggedAs UtilsTestTag in {
      StructureCdr3Search.normalizeGene("tra") shouldEqual "TRA"
      StructureCdr3Search.normalizeGene("  trb ") shouldEqual "TRB"
      StructureCdr3Search.normalizeGene("") shouldEqual StructureCdr3Search.BothChains
      StructureCdr3Search.normalizeGene(null) shouldEqual StructureCdr3Search.BothChains
    }
  }

  "StructureCdr3Search.tally" should {

    "count matching rows per structure, case-insensitively" taggedAs UtilsTestTag in {
      val stats = StructureCdr3Search.tally(
        table(Seq(("a", "CASSF", "TRB"), ("a", "cassf", "TRB"), ("b", "CASSF", "TRA"), ("c", "WWWWW", "TRB"))),
        query = "cassf", substring = false)

      stats("a").matches shouldEqual 2
      stats("b").matches shouldEqual 1
      stats.keySet should not contain "c"
    }

    "match a substring only when asked to" taggedAs UtilsTestTag in {
      val source = table(Seq(("a", "CASSYRF", "TRB")))

      StructureCdr3Search.tally(source, "SSY", substring = true) should have size 1
      StructureCdr3Search.tally(source, "SSY", substring = false) shouldBe empty
      StructureCdr3Search.tally(source, "CASSYRF", substring = false) should have size 1
    }

    "record which chains a structure matched on" taggedAs UtilsTestTag in {
      val stats = StructureCdr3Search.tally(
        table(Seq(("a", "CASSF", "TRA"), ("a", "CASSF", "TRB"), ("b", "CASSF", "TRA"))),
        query = "CASSF", substring = false)

      stats("a").chainLabels shouldEqual Set("CDR3a", "CDR3b")
      stats("b").chainLabels shouldEqual Set("CDR3a")
    }

    "tally the masked patterns it produced" taggedAs UtilsTestTag in {
      val stats = StructureCdr3Search.tally(
        table(Seq(("a", "CASSY", "TRB"), ("a", "CASSY", "TRB"), ("a", "SSYRF", "TRB"))),
        query = "SSY", substring = true)

      stats("a").patternCounts shouldEqual Map("XXSSY" -> 2, "SSYXX" -> 1)
    }

    "find nothing for an empty query, or a table without the columns" taggedAs UtilsTestTag in {
      val source = table(Seq(("a", "CASSF", "TRB")))

      StructureCdr3Search.tally(source, "", substring = true) shouldBe empty
      StructureCdr3Search.tally(Table.create("empty", StringColumn.create("gene")), "CASSF", substring = false) shouldBe empty
    }
  }

  "StructureCdr3Search.distinctClusters" should {

    "keep the first of each cluster, in the order given" taggedAs UtilsTestTag in {
      val ordered = Seq(candidate("x", 9), candidate("y", 5), candidate("x", 3), candidate("z", 1))

      StructureCdr3Search.distinctClusters(ordered, 10).map(_.cluster.clusterId) shouldEqual Seq("x", "y", "z")
    }

    "top up past a duplicate rather than letting it cost a slot" taggedAs UtilsTestTag in {
      val ordered = Seq(candidate("x", 9), candidate("x", 8), candidate("y", 7), candidate("z", 6))

      StructureCdr3Search.distinctClusters(ordered, 2).map(_.cluster.clusterId) shouldEqual Seq("x", "y")
    }

    "return fewer than the limit when the distinct clusters run out" taggedAs UtilsTestTag in {
      // The ordinary case for a narrow query: two hits on one structure is one cluster.
      val ordered = Seq(candidate("x", 9), candidate("x", 8))

      StructureCdr3Search.distinctClusters(ordered, 5).map(_.cluster.clusterId) shouldEqual Seq("x")
    }

    "return nothing for a non-positive limit" taggedAs UtilsTestTag in {
      StructureCdr3Search.distinctClusters(Seq(candidate("x", 1)), 0) shouldBe empty
    }
  }

  "StructureCdr3Search.rank" should {

    "order one list by raw count and the other by share of the cluster" taggedAs UtilsTestTag in {
      // The two disagree on purpose: a big cluster wins on count, a focused one wins on share.
      val big = StructureCdr3Search.Candidate(cluster("big", 100), score = 10, normalizedScore = 0.1, "P", None)
      val focused = StructureCdr3Search.Candidate(cluster("focused", 4), score = 4, normalizedScore = 1.0, "P", None)

      val (byCount, byShare) = StructureCdr3Search.rank(Seq(focused, big), 10)

      byCount.map(_.cluster.clusterId) shouldEqual Seq("big", "focused")
      byShare.map(_.cluster.clusterId) shouldEqual Seq("focused", "big")
      byCount.head.info shouldEqual 10.0
      byShare.head.info shouldEqual 1.0
    }
  }
}

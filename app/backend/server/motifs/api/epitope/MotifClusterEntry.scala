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

package backend.server.motifs.api.epitope

import play.api.libs.json.{Format, Json}
import tech.tablesaw.api.Table

import scala.collection.JavaConverters._

case class MotifClusterEntry(position: Int, aa: Seq[MotifClusterEntryAA])

object MotifClusterEntry {
  implicit val motifClusterEntryFormat: Format[MotifClusterEntry] = Json.format[MotifClusterEntry]

  def fromTable(table: Table, aggregate: Boolean = false): MotifClusterEntry = {
    val pos = table.intColumn("pos").asList.asScala.toSet

    assert(pos.size == 1)

    val position = pos.head

    if (aggregate) {
      // tcremp: a (cid, len) group spans multiple v/j representatives, so each (pos, aa) has one
      // row per representative. Collapse by amino-acid letter, preserving the precomputed heights:
      // height.I is background-independent (constant across reprs) -> raw H; height.I.norm varies
      // per V/J background -> mean -> HNorm. (For tcrnet there is a single repr, so mean == value.)
      case class Acc(count: Int, freqSum: Double, iSum: Double, hISum: Double, hINormSum: Double, n: Int, len: Int)
      val byLetter = scala.collection.mutable.LinkedHashMap.empty[String, Acc]
      table.doWithRows { row =>
        val letter = row.getString("aa")
        val prev = byLetter.getOrElse(letter, Acc(0, 0.0, 0.0, 0.0, 0.0, 0, 0))
        byLetter(letter) = Acc(
          prev.count + row.getInt("count"),
          prev.freqSum + row.getDouble("freq"),
          prev.iSum + row.getDouble("I"),
          prev.hISum + row.getDouble("height.I"),
          prev.hINormSum + row.getDouble("height.I.norm"),
          prev.n + 1,
          row.getInt("len")
        )
      }

      val aa = byLetter.toSeq.map { case (letter, a) =>
        val n = math.max(1, a.n)
        MotifClusterEntryAA(letter, a.len, a.count, a.freqSum / n, a.iSum / n, a.iSum / n, a.hISum / n, a.hINormSum / n)
      }.sortBy(-_.H)

      MotifClusterEntry(position, aa)
    } else {
      val aa = scala.collection.mutable.ListBuffer.empty[MotifClusterEntryAA]

      table.doWithRows { row =>
        aa += MotifClusterEntryAA(
          row.getString("aa"),
          row.getInt("len"),
          row.getInt("count"),
          row.getDouble("freq"),
          row.getDouble("I"),
          row.getDouble("I.norm"),
          row.getDouble("height.I"),
          row.getDouble("height.I.norm")
        )
      }

      MotifClusterEntry(position, aa.toSeq)
    }
  }
}

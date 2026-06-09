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

  private val Log2: Double = Math.log(2.0)
  private val Log2_20: Double = Math.log(20.0) / Log2

  def fromTable(table: Table, aggregate: Boolean = false): MotifClusterEntry = {
    val pos = table.intColumn("pos").asList.asScala.toSet

    assert(pos.size == 1)

    val position = pos.head

    if (aggregate) {
      // tcremp: each row is one representative member of the cluster (count == 1, freq == 1/csz),
      // so a position holds one row per representative and `freq`/`height.I` are per-member weights,
      // NOT per-position letter frequencies. Build the cluster PWM from letter frequencies instead:
      //   freq(aa) = countSum(aa) / countSum(all)         (fraction of members carrying aa here)
      //   I (raw)  = 1 - H(freq)/log2(20)                 -> conserved positions reach height 1.0
      //   I.norm   = mean of the precomputed per-representative I.norm (VDJ background removed)
      //   H = freq*I (raw height),  HNorm = freq*I.norm (background-subtracted height, same scale)
      case class Acc(countSum: Int, len: Int)
      val byLetter = scala.collection.mutable.LinkedHashMap.empty[String, Acc]
      var totalCount = 0
      var iNormSumAll = 0.0
      var rowsAll = 0
      table.doWithRows { row =>
        val letter = row.getString("aa")
        val c = row.getInt("count")
        val prev = byLetter.getOrElse(letter, Acc(0, 0))
        byLetter(letter) = Acc(prev.countSum + c, row.getInt("len"))
        totalCount += c
        iNormSumAll += row.getDouble("I.norm")
        rowsAll += 1
      }

      if (totalCount <= 0 || rowsAll == 0) {
        MotifClusterEntry(position, Seq.empty)
      } else {
        val total = totalCount.toDouble
        val H = byLetter.values.foldLeft(0.0) { (acc, a) =>
          val p = a.countSum / total
          if (p > 0.0) acc - p * (Math.log(p) / Log2) else acc
        }
        val I = math.max(0.0, 1.0 - H / Log2_20)
        val INormPos = math.max(0.0, iNormSumAll / rowsAll)

        val aa = byLetter.toSeq.map { case (letter, a) =>
          val freq = a.countSum / total
          MotifClusterEntryAA(letter, a.len, a.countSum, freq, I, INormPos, freq * I, freq * INormPos)
        }.sortBy(-_.H)

        MotifClusterEntry(position, aa)
      }
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

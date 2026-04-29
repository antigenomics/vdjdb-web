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

  def recomputeHeightForAA(table: Table, targetAA: String): Double = {
    val counts = scala.collection.mutable.HashMap.empty[String, Int]
    table.doWithRows { row =>
      val letter = row.getString("aa")
      counts(letter) = counts.getOrElse(letter, 0) + row.getInt("count")
    }
    val total = counts.values.sum.toDouble
    if (total <= 0.0) 0.0
    else {
      val H = counts.values.foldLeft(0.0) { (acc, c) =>
        val p = c.toDouble / total
        if (p > 0.0) acc - p * (Math.log(p) / Log2) else acc
      }
      val I = math.max(0.0, 1.0 - H / Log2_20)
      val freq = counts.getOrElse(targetAA, 0).toDouble / total
      freq * I
    }
  }

  def fromTable(table: Table, recomputePWM: Boolean = false): MotifClusterEntry = {
    val pos = table.intColumn("pos").asList.asScala.toSet

    assert(pos.size == 1)

    val position = pos.head

    if (recomputePWM) {
      val counts = scala.collection.mutable.LinkedHashMap.empty[String, Int]
      var len = 0
      table.doWithRows { row =>
        val letter = row.getString("aa")
        val c = row.getInt("count")
        counts(letter) = counts.getOrElse(letter, 0) + c
        len = row.getInt("len")
      }

      val total = counts.values.sum.toDouble
      if (total <= 0.0) {
        MotifClusterEntry(position, Seq.empty)
      } else {
        val H = counts.values.foldLeft(0.0) { (acc, c) =>
          val p = c.toDouble / total
          if (p > 0.0) acc - p * (Math.log(p) / Log2) else acc
        }
        val I = math.max(0.0, 1.0 - H / Log2_20)

        val aa = counts.toSeq
          .map { case (letter, count) =>
            val freq = count.toDouble / total
            val height = freq * I
            MotifClusterEntryAA(letter, len, count, freq, I, I, height, height)
          }
          .sortBy(-_.H)

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

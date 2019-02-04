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

package backend.utils

import java.security.MessageDigest

import scala.util.Random

object CommonUtils {

  def randomAlphaNumericString(length: Int): String = Random.alphanumeric.take(length).mkString

  def randomAlphabetString(alphabet: String)(length: Int): String = Stream.continually(Random.nextInt(alphabet.length)).map(alphabet).take(length).mkString

  def randomAlphaString(length: Int): String = randomAlphabetString("abcdefghijklmnopqrstuvwxyz")(length)

  def md5(s: String): String = {
    val m = MessageDigest.getInstance("MD5")
    val b = s.getBytes("UTF-8")
    m.update(b, 0, b.length)
    new java.math.BigInteger(1, m.digest()).toString(16).reverse.padTo(32, "0").reverse.mkString
  }

}

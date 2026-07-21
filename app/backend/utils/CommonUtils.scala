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

import java.security.{MessageDigest, SecureRandom}

import scala.util.Random

object CommonUtils {

  /** `scala.util.Random` is a seeded LCG — predictable, so it must never be used for anything a user
    * authenticates with. Use `secureRandomString` for tokens. */
  private final val secureRandom = new SecureRandom()

  /** Crockford-flavoured base32: lowercase letters and digits minus the pairs people mistype
    * (`0`/`o`, `1`/`l`/`i`). 31 symbols ~= 4.95 bits per character, so 26 characters is ~128 bits.
    * Staying lowercase-alphanumeric also satisfies `SignupTemporaryForm`'s charset check. */
  private final val secureAlphabet = "abcdefghjkmnpqrstuvwxyz23456789"

  def secureRandomString(length: Int): String = {
    val builder = new StringBuilder(length)
    var i       = 0
    while (i < length) {
      builder.append(secureAlphabet.charAt(secureRandom.nextInt(secureAlphabet.length)))
      i += 1
    }
    builder.toString
  }

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

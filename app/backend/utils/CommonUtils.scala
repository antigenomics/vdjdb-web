package backend.utils

import scala.util.Random

object CommonUtils {

    def randomAlphaNumericString(length: Int): String = Random.alphanumeric.take(length).mkString

    def randomAlphabetString(alphabet: String)(length: Int): String = Stream.continually(Random.nextInt(alphabet.length)).map(alphabet).take(length).mkString

    def randomAlphaString(length: Int): String = randomAlphabetString("abcdefghijklmnopqrstuvwxyz")(length)

}

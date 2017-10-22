package models.files

import backend.models.files.temporary.TemporaryFileProvider
import org.scalatest._
import org.scalatest.mockito.MockitoSugar
import org.scalatestplus.play._

class TemporaryFileProviderSpec extends PlaySpec with MockitoSugar {

    "TemporaryFileProvider" must {

        "create temporary file" in {

            val temporaryFileProvider = mock[TemporaryFileProvider]


        }

    }
}

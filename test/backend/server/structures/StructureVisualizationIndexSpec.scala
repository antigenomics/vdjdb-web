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

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}

import backend.BaseTestSpec
import backend.utils.UtilsTestTag
import org.scalatest.Assertion

/** Against a temporary directory rather than a fixture, so the awkward cases — a manifest pointing
  * outside the root, a file that is not there, a mixed-case id — can each be set up exactly.
  *
  * The containment checks matter more than they look: every id reaching this class came out of a
  * database cell, so "resolve a path from user text and serve the file" is the whole risk.
  */
class StructureVisualizationIndexSpec extends BaseTestSpec {

  private def withRoot(test: Path => Assertion): Assertion = {
    val root = Files.createTempDirectory("structure-index-spec")
    Files.createDirectory(root.resolve("structure"))
    try test(root)
    finally {
      Files.walk(root).sorted(java.util.Comparator.reverseOrder[Path]()).forEach(p => Files.deleteIfExists(p))
    }
  }

  private def write(path: Path, content: String): Path = {
    Files.createDirectories(path.getParent)
    Files.write(path, content.getBytes(StandardCharsets.UTF_8))
  }

  "StructureVisualizationIndex" should {

    "resolve a contact map that follows the naming convention" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("structure/1abc.html"), "<svg/>")
      val visualization = new StructureVisualizationIndex(root).resolve("1abc").value

      visualization.url shouldEqual "/structure-files/structure/1abc.html"
      visualization.kind shouldEqual "html"
      visualization.simpleUrl shouldBe empty
    }

    "report the simplified variant only when the file is there" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("structure/1abc.html"), "<svg/>")
      write(root.resolve("structure/1abc_simplified.html"), "<svg/>")
      write(root.resolve("structure/2def.html"), "<svg/>")
      val index = new StructureVisualizationIndex(root)

      index.resolve("1abc").value.simpleUrl.value shouldEqual "/structure-files/structure/1abc_simplified.html"
      // A dead link here would be worse than none: the overlay renders the simplified variant for
      // every layer behind the front one.
      index.resolve("2def").value.simpleUrl shouldBe empty
    }

    "find a lower-case file from a mixed-case id" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("structure/1abc.html"), "<svg/>")
      // Compared case-insensitively on purpose. On a case-insensitive filesystem (macOS, where this
      // is developed) the id-as-written matches first and the URL keeps its case; on Linux, where it
      // is deployed, that candidate misses and the lower-cased one wins. Both find the same file.
      new StructureVisualizationIndex(root).resolve("1ABC").value.url.toLowerCase shouldEqual
        "/structure-files/structure/1abc.html"
    }

    "resolve nothing for an unknown id, a blank one, or null" taggedAs UtilsTestTag in withRoot { root =>
      val index = new StructureVisualizationIndex(root)
      index.resolve("nosuchid") shouldBe empty
      index.resolve("  ") shouldBe empty
      index.resolve(null) shouldBe empty
      index.exists("nosuchid") shouldEqual false
    }

    "resolve nothing at all when the structure directory is absent" taggedAs UtilsTestTag in {
      // What a deployment missing its structure files looks like: an empty browser, not an error.
      val root = Files.createTempDirectory("structure-index-empty")
      try new StructureVisualizationIndex(root).resolve("1abc") shouldBe empty
      finally Files.deleteIfExists(root)
    }

    "refuse an id that climbs out of the structure directory" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("secret.html"), "not for serving")
      // The id is free text from a database cell, so this is reachable input, not a hypothetical.
      new StructureVisualizationIndex(root).resolve("../secret") shouldBe empty
    }

    "prefer the manifest over the on-disk convention" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("structure/1abc.html"), "<svg/>")
      write(root.resolve("custom/elsewhere.html"), "<svg/>")
      write(root.resolve("structure_html_mapping.json"),
        """{"visualizations":[{"structureId":"1abc","relativePath":"custom/elsewhere.html","type":"html"}]}""")

      new StructureVisualizationIndex(root).resolve("1abc").value.url shouldEqual
        "/structure-files/custom/elsewhere.html"
    }

    "carry the manifest's declared type" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("custom/picture.png"), "not really a png")
      write(root.resolve("structure_html_mapping.json"),
        """{"visualizations":[{"structureId":"1abc","relativePath":"custom/picture.png","type":"png"}]}""")

      // getHtmlVisualizations filters on kind, so a non-html entry must survive resolution and be
      // excluded there rather than being dropped here.
      new StructureVisualizationIndex(root).resolve("1abc").value.kind shouldEqual "png"
    }

    "drop a manifest entry that points outside the root or at nothing" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("structure/1abc.html"), "<svg/>")
      write(root.resolve("structure_html_mapping.json"),
        """{"visualizations":[
          |  {"structureId":"escape","relativePath":"../../etc/passwd"},
          |  {"structureId":"missing","relativePath":"structure/nosuchfile.html"},
          |  {"structureId":"1abc","relativePath":"structure/1abc.html"}
          |]}""".stripMargin)
      val index = new StructureVisualizationIndex(root)

      index.resolve("escape") shouldBe empty
      index.resolve("missing") shouldBe empty
      index.resolve("1abc") should not be empty
    }

    "fall back to the convention when the manifest is unreadable" taggedAs UtilsTestTag in withRoot { root =>
      write(root.resolve("structure/1abc.html"), "<svg/>")
      write(root.resolve("structure_html_mapping.json"), "{ this is not json")

      // A corrupt manifest must not take the whole structure browser down with it.
      new StructureVisualizationIndex(root).resolve("1abc").value.url shouldEqual
        "/structure-files/structure/1abc.html"
    }
  }
}

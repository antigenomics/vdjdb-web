package backend.utils

import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.util.zip.GZIPOutputStream
import backend.BaseTestSpec
import backend.server.structures.StructureTableLoader

class TableFilesSpec extends BaseTestSpec {
  "Legacy table readers" should {
    "load compressed structure tables through their logical plain filename" in {
      val directory = Files.createTempDirectory("legacy-gzip")
      val plain = directory.resolve("vdjdb.txt")
      val zipped = directory.resolve("vdjdb.txt.gz")
      val content = "gene\tcdr3\tmhc.a\tmhc.b\nTRB\tCASSF\tHLA-A*02:01\tB2M\n"
      try {
        val out = new GZIPOutputStream(Files.newOutputStream(zipped))
        try out.write(content.getBytes(StandardCharsets.UTF_8)) finally out.close()
        val source = TableFiles.source(plain.toFile)
        try source.mkString shouldBe content finally source.close()
        val compressed = StructureTableLoader.load(plain.toString)
        Files.write(plain, content.getBytes(StandardCharsets.UTF_8))
        val uncompressed = StructureTableLoader.load(plain.toString)
        compressed.rowCount() shouldBe 1
        compressed.columnNames() shouldBe uncompressed.columnNames()
        compressed.stringColumn("cdr3").get(0) shouldBe "CASSF"
        compressed.stringColumn("mhc.pair").get(0) shouldBe "HLA-A*02/B2M"
        TableFiles.resolve(plain.toFile) shouldBe plain.toFile
      } finally {
        Files.deleteIfExists(plain)
        Files.deleteIfExists(zipped)
        Files.deleteIfExists(directory)
      }
    }
  }
}

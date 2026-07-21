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

// Lives in the converter's own package so the spec can exercise the `private[sample]` helpers
// (cleanSegment, chainOf, backTranslate, …) directly rather than only through `convert`.
package backend.utils.files.sample

import java.io.{File, FileOutputStream, OutputStreamWriter, PrintWriter}
import java.util.zip.GZIPInputStream

import org.scalatest.{Matchers, WordSpec}

import scala.io.{Codec, Source}

class SampleConverterSpec extends WordSpec with Matchers {

  private def write(lines: Seq[String]): File = {
    val f = File.createTempFile("converter-in-", ".txt")
    f.deleteOnExit()
    val w = new PrintWriter(new OutputStreamWriter(new FileOutputStream(f), "UTF-8"))
    try lines.foreach(w.println) finally w.close()
    f
  }

  private def readGz(f: File): Seq[Array[String]] = {
    val src = Source.fromInputStream(new GZIPInputStream(new java.io.FileInputStream(f)))(Codec.UTF8)
    try src.getLines().toList.map(_.split("\t", -1)) finally src.close()
  }

  private def convert(lines: Seq[String], max: Long = 200000): SampleConverter.Report = {
    val prefix = File.createTempFile("converter-out-", "")
    prefix.deleteOnExit()
    SampleConverter.convert(write(lines), prefix, max)
  }

  "SampleConverter" should {

    "strip allele and score suffixes from segment calls" in {
      SampleConverter.cleanSegment("TRBV7-9*01") shouldBe "TRBV7-9"
      SampleConverter.cleanSegment("TRBV7-9*00(1234.5)") shouldBe "TRBV7-9"   // MiXCR
      SampleConverter.cleanSegment("TRBV7-8*01,TRBV7-9*03") shouldBe "TRBV7-8" // AIRR tie
      SampleConverter.cleanSegment("") shouldBe "."
    }

    "derive the chain from the locus column or the J segment" in {
      SampleConverter.chainOf("TRBJ2-7", None) shouldBe Some("TRB")
      SampleConverter.chainOf("TRAJ33", None) shouldBe Some("TRA")
      SampleConverter.chainOf("IGHJ4", None) shouldBe None // single-chain TRA/TRB only
      SampleConverter.chainOf("", Some("TRB")) shouldBe Some("TRB")
      // An explicit locus column is the format stating the answer outright, so it outranks the
      // segment name when the two disagree.
      SampleConverter.chainOf("TRBJ2-6", Some("TRA")) shouldBe Some("TRA")
    }

    "recognise the junction convention" in {
      SampleConverter.looksLikeJunction("CASSLVSGANVLTF") shouldBe true
      SampleConverter.looksLikeJunction("ASSLVSGANVLT") shouldBe false
    }

    "back-translate in frame using only ACGT" in {
      val nt = SampleConverter.backTranslate("CASSF")
      nt.length shouldBe 15
      nt.forall("ACGT".contains(_)) shouldBe true
    }

    "convert an AIRR table, keeping junction_aa verbatim and the real nucleotide junction" in {
      val report = convert(Seq(
        "sequence_id\tv_call\tj_call\tjunction_aa\tjunction\tduplicate_count\tlocus\tproductive",
        "s1\tTRBV7-9*01\tTRBJ2-6*01\tCASSLVSGANVLTF\tTGTGCCAGCAGCTTAGTCTCTGGGGCCAACGTCCTGACTTTC\t10\tTRB\tT"))

      report.format shouldBe "AIRR"
      report.chains.map(_.chain) shouldBe Seq("TRB")
      val rows = readGz(report.chains.head.file)
      rows.head.length shouldBe 11                       // vdjtools BaseParser is positional
      rows(1)(0) shouldBe "10"                           // count
      rows(1)(2) shouldBe "TGTGCCAGCAGCTTAGTCTCTGGGGCCAACGTCCTGACTTTC"
      rows(1)(3) shouldBe "CASSLVSGANVLTF"
      rows(1)(4) shouldBe "TRBV7-9"
      rows(1)(6) shouldBe "TRBJ2-6"
      rows(1)(1).toDouble should be > 0.0                // a zero freq makes vdjtools drop the row
    }

    "drop non-productive rows and rows carrying a stop codon" in {
      val report = convert(Seq(
        "v_call\tj_call\tjunction_aa\tproductive",
        "TRBV7-9*01\tTRBJ2-6*01\tCASSLVSGANVLTF\tT",
        "TRBV7-9*01\tTRBJ2-6*01\tCASSXYZ*QF\tT",
        "TRBV7-9*01\tTRBJ2-6*01\tCASSNONPRODF\tF"))
      report.chains.head.clonotypes shouldBe 1
      report.skippedRows shouldBe 2
    }

    "re-add the conserved anchors when the input is IMGT CDR3 rather than the junction" in {
      val report = convert(Seq("v_call\tj_call\timgt_cdr3_aa\tlocus",
                               "TRBV7-9*01\tTRBJ2-6*01\tASSLVSGANVLT\tTRB"))
      readGz(report.chains.head.file)(1)(3) shouldBe "CASSLVSGANVLTF"
      report.warnings.exists(_.contains("IMGT")) shouldBe true
    }

    "read MiXCR hit-with-score columns" in {
      val report = convert(Seq(
        "cloneCount\tcloneFraction\tnSeqCDR3\taaSeqCDR3\tallVHitsWithScore\tallDHitsWithScore\tallJHitsWithScore",
        "42\t0.5\tTGTGCCAGCAGCTTAGTCTCTGGGGCCAACGTCCTGACTTTC\tCASSLVSGANVLTF\tTRBV7-9*00(1234.5)\tTRBD1*00(12)\tTRBJ2-6*00(99.1)"))
      report.format shouldBe "MiXCR"
      val row = readGz(report.chains.head.file)(1)
      row(0) shouldBe "42"
      row(4) shouldBe "TRBV7-9"
      row(5) shouldBe "TRBD1"
    }

    "accept a plain v/j/cdr3aa table, defaulting count and synthesising the junction" in {
      val report = convert(Seq("v\tj\tcdr3aa", "TRBV7-9\tTRBJ2-6\tCASSLVSGANVLTF"))
      val row = readGz(report.chains.head.file)(1)
      row(0) shouldBe "1"
      row(2).length shouldBe row(3).length * 3           // in frame, or vdjtools drops it
      row(2).forall("ACGTN".contains(_)) shouldBe true
      report.warnings.exists(_.contains("placeholder")) shouldBe true
    }

    "split a mixed-chain file into one sample per chain" in {
      val report = convert(Seq("v\tj\tcdr3aa",
                               "TRBV7-9\tTRBJ2-6\tCASSLVSGANVLTF",
                               "TRAV1-2\tTRAJ33\tCAVMDSNYQLIW"))
      report.chains.map(_.chain) shouldBe Seq("TRA", "TRB")
      report.chains.foreach(_.clonotypes shouldBe 1L)
      // each chain is normalised independently, so its frequencies sum to 1
      report.chains.foreach { c => readGz(c.file)(1)(1).toDouble shouldBe 1.0 +- 1e-9 }
    }

    "reject a sample that exceeds the clonotype cap" in {
      val rows = Seq("v\tj\tcdr3aa") ++ Seq.fill(12)("TRBV7-9\tTRBJ2-6\tCASSLVSGANVLTF")
      an[SampleConverter.ConversionException] should be thrownBy convert(rows, max = 10)
      convert(rows, max = 12).chains.head.clonotypes shouldBe 12L
    }

    "fail loudly when the CDR3 or segment columns are missing" in {
      an[SampleConverter.ConversionException] should be thrownBy convert(Seq("a\tb", "1\t2"))
    }

    "reject a file with no usable alpha/beta records" in {
      an[SampleConverter.ConversionException] should be thrownBy
        convert(Seq("v\tj\tcdr3aa", "IGHV1-2\tIGHJ4\tCARDYW"))
    }
  }
}

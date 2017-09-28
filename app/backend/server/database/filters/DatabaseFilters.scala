package backend.server.database.filters

import java.util

import backend.server.database.Database
import com.antigenomics.vdjdb.scoring.{DummyAlignmentScoring, SequenceSearcherPreset}
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters

import scala.collection.JavaConverters._
import scala.collection.mutable.ListBuffer

case class DatabaseFilters(text: util.ArrayList[TextFilter], sequence: util.ArrayList[SequenceFilter], warnings: List[String])

object DatabaseFilters {
    def createFromRequest(request: List[DatabaseFilterRequest], database: Database): DatabaseFilters = {
        val warnings = ListBuffer[String]()
        val text = new util.ArrayList[TextFilter]()
        val sequence = new util.ArrayList[SequenceFilter]()

        request.foreach((filter: DatabaseFilterRequest) => {
            if (database.getInstance.getDbInstance.getColumns.asScala.exists(_.getName == filter.column)) {
                filter.filterType match {
                    case DatabaseFilterType.Exact => text.add(new ExactTextFilter(filter.column, filter.value, filter.negative))
                    case DatabaseFilterType.SubstringSet => text.add(new SubstringSetTextFilter(filter.column, filter.value, filter.negative))
                    case DatabaseFilterType.ExactSet => text.add(new ExactSetTextFilter(filter.column, filter.value, filter.negative))
                    case DatabaseFilterType.Pattern => text.add(new PatternTextFilter(filter.column, filter.value, filter.negative))
                    case DatabaseFilterType.Level => text.add(new LevelFilter(filter.column, filter.value, filter.negative))
                    case DatabaseFilterType.Range => text.add(new MinMaxFilter(filter.column, filter.value.split(":")(0).toInt, filter.value.split(":")(1).toInt))
                    case DatabaseFilterType.Sequence =>
                        if (filter.column.startsWith("cdr3") || filter.column.startsWith("antigen.epitope")) {
                            val values = filter.value.split(":")
                            val query = values(0)
                            val substitutions = values(1).toInt
                            val insertions = values(2).toInt
                            val deletions = values(3).toInt
                            val total = substitutions + insertions + deletions
                            val preset: SequenceSearcherPreset = new SequenceSearcherPreset(new TreeSearchParameters(substitutions, insertions, deletions, total), DummyAlignmentScoring.INSTANCE)
                            sequence.add(new SequenceFilter(filter.column, query, preset))
                        } else {
                            warnings += "Sequence filters can only be applied to 'cdr3' or 'antigen.epitope'"
                        }
                    case _ =>
                        warnings += ("Invalid filter type: " + filter.filterType)
                }
            } else {
                warnings += ("Invalid column name: " + filter.column)
            }
        })
        DatabaseFilters(text, sequence, warnings.toList)
    }

}
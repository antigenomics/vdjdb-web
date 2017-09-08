package backend.server.filters

import java.util

import backend.server.database.Database
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import scala.collection.JavaConverters._

import scala.collection.mutable.ListBuffer

case class DatabaseFilters(text: util.ArrayList[TextFilter], sequence: util.ArrayList[SequenceFilter], warnings: List[String])

object DatabaseFilters {
    def createFromRequest(request: List[RequestFilter], database: Database): DatabaseFilters = {
        val warnings = ListBuffer[String]()
        val metadata = database.getMetadata
        val text = new util.ArrayList[TextFilter]()
        val sequence = new util.ArrayList[SequenceFilter]()

        request.foreach((filter: RequestFilter) => {
            if (database.getInstance.getDbInstance.getColumns.asScala.exists(_.getName == filter.column)) {
                filter.filterType match {
                    case FilterType.Exact => text.add(new ExactTextFilter(filter.column, filter.value, filter.negative))
                    case FilterType.SubstringSet => text.add(new SubstringSetTextFilter(filter.column, filter.value, filter.negative))
                    case FilterType.ExactSet => text.add(new ExactSetTextFilter(filter.column, filter.value, filter.negative))
                    case FilterType.Pattern => text.add(new PatternTextFilter(filter.column, filter.value, filter.negative))
                    case FilterType.Level => text.add(new LevelFilter(filter.column, filter.value, filter.negative))
                    case FilterType.Range => text.add(new MinMaxFilter(filter.column, filter.value.split(":")(0).toInt, filter.value.split(":")(1).toInt))
                    case FilterType.Sequence =>
                        if (filter.column.startsWith("cdr3") || filter.column.startsWith("antigen.epitope")) {
                            //TODO
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

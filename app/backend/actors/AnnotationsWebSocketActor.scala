package backend.actors

import java.nio.file.{Files, Paths}

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.{User, UserDetails, UserProvider}
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.SampleFileProvider
import backend.models.files.sample.tags.{SampleTag, SampleTagProvider, SampleTagTable}
import backend.models.files.temporary.TemporaryFileProvider
import backend.server.annotations.IntersectionTable
import backend.server.annotations.api.annotate.{SampleAnnotateRequest, SampleAnnotateResponse}
import backend.server.annotations.api.export.{AnnotationsExportDataRequest, AnnotationsExportDataResponse}
import backend.server.annotations.api.matches.{IntersectionMatchesRequest, IntersectionMatchesResponse}
import backend.server.annotations.api.sample.delete.{DeleteSampleRequest, DeleteSampleResponse}
import backend.server.annotations.api.sample.software.AvailableSoftwareResponse
import backend.server.annotations.api.sample.update_props.{UpdateSamplePropsInfoRequest, UpdateSamplePropsInfoResponse}
import backend.server.annotations.api.sample.update_stats.UpdateSampleStatsInfoResponse
import backend.server.annotations.api.sample.validate.{ValidateSampleRequest, ValidateSampleResponse}
import backend.server.annotations.api.tag.create.{CreateTagRequest, CreateTagResponse}
import backend.server.annotations.api.tag.delete.{DeleteTagRequest, DeleteTagResponse}
import backend.server.annotations.api.tag.update.{UpdateTagRequest, UpdateTagResponse}
import backend.server.annotations.api.user.UserDetailsResponse
import backend.server.annotations.export.IntersectionTableConverter
import backend.server.database.Database
import backend.server.database.api.metadata.DatabaseMetadataResponse
import backend.server.limit.{IpLimit, RequestLimits}
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import com.antigenomics.vdjtools.sample.Sample
import org.slf4j.LoggerFactory
import play.api.libs.json._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}
import scala.async.Async.{async, await}
import scala.collection.mutable

class AnnotationsWebSocketActor(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
                               (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, up: UserProvider, stp: SampleTagProvider,
                                upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider, tfp: TemporaryFileProvider)
    extends WebSocketActor(out, limit) {
    private final val logger = LoggerFactory.getLogger(this.getClass)
    private val intersectionTableResults: mutable.HashMap[String, IntersectionTable] = new mutable.HashMap()

    def handleMessage(out: WebSocketOutActorRef, data: Option[JsValue]): Unit = {
        out.getAction match {
            case UserDetailsResponse.Action =>
                out.success(UserDetailsResponse(details))
            case AvailableSoftwareResponse.Action =>
                out.success(AvailableSoftwareResponse(Software.values().map(_.toString)))
            case ValidateSampleResponse.Action =>
                validateData(out, data, (validateRequest: ValidateSampleRequest) => {
                    user.getSampleFileByName(validateRequest.name) onComplete {
                        case Success(None) | Failure(_) =>
                            out.error(ValidateSampleResponse(false))
                        case Success(Some(sample)) =>
                            if (validateRequest.tagID != -1) {
                                stp.getByIdAndUser(validateRequest.tagID, user).onComplete {
                                    case Success(Some(tag)) =>
                                        sample.updateSampleFileTagID(tag.id)
                                    case _ =>
                                }
                            }
                            out.success(ValidateSampleResponse(true))
                    }
                })
            case DeleteSampleResponse.Action =>
                validateData(out, data, (deleteRequest: DeleteSampleRequest) => {
                    val deleteFuture = if (deleteRequest.all) sfp.deleteAllForUser(user) else sfp.deleteForUser(user, deleteRequest.name)
                    deleteFuture onComplete {
                        case Success(0) | Failure(_) =>
                            out.error(DeleteSampleResponse(false))
                        case Success(_) =>
                            if (intersectionTableResults.contains(deleteRequest.name)) {
                                intersectionTableResults -= deleteRequest.name
                            }
                            out.success(DeleteSampleResponse(true))
                    }
                })
            case SampleAnnotateResponse.Action =>
                validateData(out, data, (intersectRequest: SampleAnnotateRequest) => async {
                    val sampleFile = await(user.getSampleFileByNameWithMetadata(intersectRequest.sampleName))
                    sampleFile match {
                        case Some(file) =>
                            try {
                                out.success(SampleAnnotateResponse.ParseState)
                                val sample = SampleFileConnection.load(file._2.path, Software.valueOf(file._1.software))

                                if (file._1.isSampleFileInfoEmpty) {
                                    val readsCount = sample.getCount
                                    val clonotypesCount = sample.getDiversity.toLong
                                    file._1.updateSampleFileInfo(readsCount, clonotypesCount).onComplete {
                                        case Success(_) => out.success(
                                            UpdateSampleStatsInfoResponse(file._1.sampleName, readsCount, clonotypesCount),
                                            UpdateSampleStatsInfoResponse.Action)
                                        case Failure(t) => logger.error(s"Update sample file info failed: ${t.getMessage}")
                                    }
                                }

                                val table = new IntersectionTable()
                                out.success(SampleAnnotateResponse.AnnotateState)
                                table.update(intersectRequest, sample, database)
                                out.success(SampleAnnotateResponse.LoadingState)
                                intersectionTableResults += (file._1.sampleName -> table)
                                out.success(SampleAnnotateResponse.CompletedState(table.getRows, table.summary))
                            } catch {
                                case e: Exception =>
                                    e.printStackTrace()
                                    out.errorMessage("Unable to intersect")
                            }
                        case None =>
                            out.errorMessage("Invalid file name")
                    }
                })
            case UpdateSamplePropsInfoResponse.Action =>
                validateData(out, data, (request: UpdateSamplePropsInfoRequest) => async {
                    val sampleFile = await(user.getSampleFileByName(request.prevSampleName))
                    sampleFile match {
                        case Some(sample) =>
                            sample.updateSampleFileProps(request.newSampleName, request.newSampleSoftware, request.newTagID).onComplete {
                                case Success(_) =>
                                    out.success(UpdateSamplePropsInfoResponse(
                                        request.prevSampleName,
                                        request.newSampleName,
                                        request.newSampleSoftware,
                                        request.newTagID
                                    ))
                                case Failure(_) =>
                                    out.errorMessage("An error occured during sample updating")
                            }
                        case None =>
                            out.errorMessage("Invalid file name")
                    }
                })
            case IntersectionMatchesResponse.Action =>
                validateData(out, data, (quickViewRequest: IntersectionMatchesRequest) => {
                    intersectionTableResults.get(quickViewRequest.sampleName) match {
                        case Some(table) =>
                            if (quickViewRequest.rowIndex >= 0 && table.getRecordsFound > quickViewRequest.rowIndex) {
                                val row = table.getRows(quickViewRequest.rowIndex)
                                out.success(IntersectionMatchesResponse(row.matches, row.matches.length))
                            }
                        case None =>
                            out.errorMessage("Unable to find table results")
                    }
                })
            case DatabaseMetadataResponse.Action =>
                out.success(DatabaseMetadataResponse(database.getMetadata))
            case AnnotationsExportDataResponse.Action =>
                validateData(out, data, (exportRequest: AnnotationsExportDataRequest) => {
                    val converter = IntersectionTableConverter.getConverter(exportRequest.format)
                    if (converter.nonEmpty) {
                        val table = intersectionTableResults.get(exportRequest.sampleName)
                        if (table.nonEmpty) {
                            converter.get.convert(exportRequest.sampleName, table.get, database, exportRequest.options) onComplete {
                                case Success(link) =>
                                    out.success(AnnotationsExportDataResponse(link.getDownloadLink))
                                case Failure(_) =>
                                    out.warningMessage("Unable to export")
                            }
                        }
                    }
                })
            case CreateTagResponse.Action =>
                validateData(out, data, (createTagRequest: CreateTagRequest) => {
                    if (SampleTagTable.isNameValid(createTagRequest.name) && SampleTagTable.isColorValid(createTagRequest.color)) {
                        stp.insert(SampleTag(0, createTagRequest.name, createTagRequest.color, user.id)).onComplete {
                            case Success(id) =>
                                user.getSampleFiles.onComplete {
                                    case Success(samples) =>
                                        samples.filter((sample) => createTagRequest.samples.contains(sample.sampleName)).foreach((sample) => {
                                            sample.updateSampleFileTagID(id)
                                        })
                                        out.success(CreateTagResponse(id))
                                    case Failure(_) => out.errorMessage("An error occured during samples tagging")
                                }
                            case Failure(_) => out.errorMessage("An error occured during tag creating")
                        }
                    } else {
                        out.errorMessage("Invalid request")
                    }
                })
            case DeleteTagResponse.Action =>
                validateData(out, data, (deleteTagRequest: DeleteTagRequest) => {
                    stp.getByIdAndUser(deleteTagRequest.tagID, user).onComplete {
                        case Success(Some(tag)) =>
                            user.getTaggedSampleFiles(tag.id).onComplete {
                                case Success(samples) =>
                                    samples.foreach((sample) => sample.updateSampleFileTagID(-1))
                                    stp.delete(tag).onComplete {
                                        case Success(_) =>
                                            out.success(DeleteTagResponse(deleteTagRequest.tagID))
                                        case _ => out.errorMessage("An error occured during tag deleting")
                                    }
                                case _ => out.errorMessage("An error occured during samples untagging")
                            }
                        case _ => out.errorMessage("Invalid request")
                    }
                })
            case UpdateTagResponse.Action =>
                validateData(out, data, (updateTagRequest: UpdateTagRequest) => async {
                    val tag = await(stp.getByIdAndUser(updateTagRequest.tagID, user))
                    if (tag.nonEmpty) {
                        val update = await(stp.update(tag.get, updateTagRequest.name, updateTagRequest.color))
                        if (update == 1) {
                            val samplesFiles = await(user.getSampleFiles)
                            // TODO Check if all updates are finished successfully
                            samplesFiles.filter((sample) => sample.tagID == tag.get.id && !updateTagRequest.samples.contains(sample.sampleName)).foreach((sample) => {
                                sample.updateSampleFileTagID(-1);
                            })
                            samplesFiles.filter((sample) => updateTagRequest.samples.contains(sample.sampleName)).foreach((sample) => {
                                sample.updateSampleFileTagID(tag.get.id)
                            })
                            out.success(UpdateTagResponse(tag.get.id))
                        } else {
                            out.errorMessage("An error occured during tag updating")
                        }
                    } else {
                        out.errorMessage("Invalid request")
                    }
                })
            case _ =>
                out.errorMessage("Invalid action")
        }
    }

}

object AnnotationsWebSocketActor {
    def props(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits, up: UserProvider, stp: SampleTagProvider,
              upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider, tfp: TemporaryFileProvider): Props =
        Props(new AnnotationsWebSocketActor(out, limit, user, details, database))
}

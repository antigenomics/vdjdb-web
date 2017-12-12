package backend.actors

import akka.actor.{ActorRef, ActorSystem, Props}
import backend.models.authorization.permissions.UserPermissionsProvider
import backend.models.authorization.user.{User, UserDetails}
import backend.models.files.FileMetadataProvider
import backend.models.files.sample.SampleFileProvider
import backend.server.annotations.IntersectionTable
import backend.server.annotations.api.intersect.{SampleIntersectionRequest, SampleIntersectionResponse}
import backend.server.annotations.api.quick_view.{IntersectionQuickViewRequest, IntersectionQuickViewResponse}
import backend.server.annotations.api.sample.delete.{DeleteSampleRequest, DeleteSampleResponse}
import backend.server.annotations.api.sample.software.AvailableSoftwareResponse
import backend.server.annotations.api.sample.validate.{ValidateSampleRequest, ValidateSampleResponse}
import backend.server.annotations.api.user.UserDetailsResponse
import backend.server.database.Database
import backend.server.limit.{IpLimit, RequestLimits}
import com.antigenomics.vdjtools.io.SampleFileConnection
import com.antigenomics.vdjtools.misc.Software
import play.api.libs.json._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}
import scala.async.Async.{async, await}
import scala.collection.mutable

class AnnotationsWebSocketActor(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
                               (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
                                upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider)
    extends WebSocketActor(out, limit) {
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
                        case Success(Some(_)) =>
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
            case SampleIntersectionResponse.Action =>
                validateData(out, data, (intersectRequest: SampleIntersectionRequest) => async {
                    val sampleFile = await(user.getSampleFileByNameWithMetadata(intersectRequest.sampleName))
                    sampleFile match {
                        case Some(file) =>
                            try {
                                out.success(SampleIntersectionResponse.ParseState)
                                val sampleFileConnection = new SampleFileConnection(file._2.path, Software.valueOf(file._1.software))
                                val sample = sampleFileConnection.getSample
                                val table = new IntersectionTable()
                                out.success(SampleIntersectionResponse.AnnotateState)
                                table.update(intersectRequest, sample, database)
                                out.success(SampleIntersectionResponse.LoadingState)
                                intersectionTableResults += (file._1.sampleName -> table)
                                out.success(SampleIntersectionResponse.CompletedState(table.getRows))
                            } catch {
                                case _: Exception => out.errorMessage("Unable to intersect")
                            }
                        case None =>
                            out.errorMessage("Invalid file name")
                    }
                })
            case IntersectionQuickViewResponse.Action =>
                validateData(out, data, (quickViewRequest: IntersectionQuickViewRequest) => {
                    intersectionTableResults.get(quickViewRequest.sampleName) match {
                        case Some(table) =>
                            if (quickViewRequest.rowIndex >= 0 && table.getRecordsFound > quickViewRequest.rowIndex) {
                                val row = table.getRows(quickViewRequest.rowIndex)
                                out.success(IntersectionQuickViewResponse(row.matches.slice(0, 10), row.matches.length))
                            }
                        case None =>
                            out.errorMessage("Unable to find table results")
                    }
                })
            case _ =>
                out.errorMessage("Invalid action")
        }
    }

}

object AnnotationsWebSocketActor {
    def props(out: ActorRef, limit: IpLimit, user: User, details: UserDetails, database: Database)
             (implicit ec: ExecutionContext, as: ActorSystem, limits: RequestLimits,
              upp: UserPermissionsProvider, sfp: SampleFileProvider, fmp: FileMetadataProvider): Props =
        Props(new AnnotationsWebSocketActor(out, limit, user, details, database))
}

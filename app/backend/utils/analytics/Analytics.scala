package backend.utils.analytics

import javax.inject.Inject

import play.api.Configuration

case class Analytics @Inject() (configuration: Configuration) {
    private val analyticsConfiguration = configuration.get[AnalyticsConfiguration]("application.analytics")

    def isYandexAnalyticsAvailable: Boolean = analyticsConfiguration.yandexID != "none"

    def getYandexAnalyticsID: String = analyticsConfiguration.yandexID

    def isGoogleAnalyticsAvailable: Boolean = analyticsConfiguration.googleID != "none"

    def getGoogleAnalyticsID: String = analyticsConfiguration.googleID
}

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

package backend.utils.analytics

import javax.inject.Inject

import play.api.Configuration

case class Analytics @Inject() (configuration: Configuration) {
    private val analyticsConfiguration = configuration.get[AnalyticsConfiguration]("application.analytics")

    def isAnalyticsEnabled: Boolean = analyticsConfiguration.enabled

    def isYandexAnalyticsAvailable: Boolean = analyticsConfiguration.yandexID != "none"

    def getYandexAnalyticsID: String = analyticsConfiguration.yandexID

    def isGoogleAnalyticsAvailable: Boolean = analyticsConfiguration.googleID != "none"

    def getGoogleAnalyticsID: String = analyticsConfiguration.googleID
}

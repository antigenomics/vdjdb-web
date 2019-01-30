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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HomePageModule } from 'pages/home/home.module';
import { OverviewPageModule } from 'pages/overview/overview.module';
import { SearchPageModule } from 'pages/search/search.module';
import { NavigationBarModule } from 'shared/navbar/navbar.module';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { ClipboardService } from 'utils/clipboard/clipboard.service';
import { LoaderModule } from 'utils/loader/loader.module';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationModule } from 'utils/notifications/notification.module';
import { LocalStorageService } from 'utils/storage/local-storage.service';
import { ApplicationComponent } from './application.component';
import { ApplicationRouting } from './application.routing';
import { ContentWrapperService } from './content-wrapper.service';

@NgModule({
  imports:      [ BrowserModule, CommonModule, ApplicationRouting, HomePageModule, OverviewPageModule, SearchPageModule,
    NotificationModule, NavigationBarModule, LoaderModule ],
  declarations: [ ApplicationComponent ],
  providers:    [ LoggerService, ClipboardService, AnalyticsService, LocalStorageService, ContentWrapperService ],
  bootstrap:    [ ApplicationComponent ]
})
export class ApplicationModule {
}

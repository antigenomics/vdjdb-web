/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ApplicationComponent } from './application.component';
import { AboutPageModule } from './pages/about/about.module';
import { AnnotationsPageModule } from './pages/annotations/annotations.module';
import { HomePageModule } from './pages/home/home.module';
import { SearchPageModule } from './pages/search/search.module';
import { NavigationBarModule } from './shared/navbar/navbar.module';
import { ClipboardService } from './utils/clipboard/clipboard.service';
import { LoggerService } from './utils/logger/logger.service';
import { NotificationModule } from './utils/notifications/notification.module';
import { LoaderModule } from './utils/loader/loader.module';

@NgModule({
    imports:      [ CommonModule, BrowserModule,
        HomePageModule, AboutPageModule, SearchPageModule, AnnotationsPageModule,
        NotificationModule, NavigationBarModule, LoaderModule,
        RouterModule.forRoot([]) ],
    declarations: [ ApplicationComponent ],
    providers:    [ LoggerService, ClipboardService ],
    bootstrap:    [ ApplicationComponent ]
})
export class ApplicationModule {
}

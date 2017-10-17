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

import { ApplicationComponent } from './application.component';
import { NavigationBarComponent } from './common/navbar/navbar.component';
import { SearchPageModule } from './pages/search/search.module';

import { RouterModule } from '@angular/router';
import { ConfigurationService } from './configuration.service';
import { AboutPageModule } from './pages/about/about.module';
import { HomePageModule } from './pages/home/home.module';
import { ClipboardService } from './utils/clipboard/clipboard.service';
import { LoggerService } from './utils/logger/logger.service';
import { NotificationService } from './utils/notification/notification.service';
import { RouteDirective } from './common/navbar/route.directive';

@NgModule({
    imports:      [ CommonModule, BrowserModule, HomePageModule, AboutPageModule, SearchPageModule, RouterModule.forRoot([]) ],
    declarations: [ ApplicationComponent, NavigationBarComponent, RouteDirective ],
    providers:    [ ConfigurationService, LoggerService, NotificationService, ClipboardService ],
    bootstrap:    [ ApplicationComponent ]
})
export class ApplicationModule {}

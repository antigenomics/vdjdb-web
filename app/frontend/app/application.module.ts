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
import { LoggerService } from './utils/logger/logger.service';
import { NotificationService } from './utils/notification/notification.service';

@NgModule({
    imports:      [ CommonModule, BrowserModule, HomePageModule, AboutPageModule, SearchPageModule, RouterModule.forRoot([]) ],
    declarations: [ ApplicationComponent, NavigationBarComponent ],
    providers:    [ ConfigurationService, LoggerService, NotificationService ],
    bootstrap:    [ ApplicationComponent ]
})
export class ApplicationModule {}

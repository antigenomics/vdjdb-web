import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { ApplicationComponent } from './application.component';
import { NavigationBarComponent } from './common/navbar/navbar.component';
import { AboutPageComponent } from './pages/about/about.component';
import { HomePageComponent } from './pages/home/home.component';
import { SearchPageModule } from './pages/search/search.module';

import { Route, RouterModule } from '@angular/router';
import { ConfigurationService } from './configuration.service';
import { DatabaseService } from './database/database.service';
import { SearchPageComponent } from './pages/search/search.component';
import { LoggerService } from './utils/logger/logger.service';
import { NotificationService } from './utils/notification/notification.service';

const routes: Route[] = [
    { path: '', component: HomePageComponent },
    { path: 'about', component: AboutPageComponent },
    { path: 'search', component: SearchPageComponent }
];

@NgModule({
    imports:      [ CommonModule, BrowserModule, SearchPageModule, RouterModule.forRoot(routes) ],
    declarations: [ ApplicationComponent, NavigationBarComponent, HomePageComponent, AboutPageComponent ],
    providers:    [ ConfigurationService, DatabaseService, LoggerService, NotificationService ],
    bootstrap:    [ ApplicationComponent ]
})
export class ApplicationModule {}

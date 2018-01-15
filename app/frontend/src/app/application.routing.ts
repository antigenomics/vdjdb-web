/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { RouterModule, Routes } from '@angular/router';
import { AboutPageComponent } from 'pages/about/about.component';
import { HomePageComponent } from 'pages/home/home.component';
import { OverviewPageComponent } from 'pages/overview/overview.component';
import { SearchPageComponent } from 'pages/search/search.component';

const routes: Routes = [
    { path: '', component: HomePageComponent },
    { path: 'about', component: AboutPageComponent },
    { path: 'overview', component: OverviewPageComponent },
    { path: 'search', component: SearchPageComponent },
    { path: 'annotations', loadChildren: 'pages/annotations/annotations.module#AnnotationsPageModule' }
];

export const ApplicationRouting = RouterModule.forRoot(routes); // tslint:disable-line:variable-name

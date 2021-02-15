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

import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from 'pages/home/home.component';
import { OverviewPageComponent } from 'pages/overview/overview.component';
import { SearchPageComponent } from 'pages/search/search.component';
import { Covid19ActionComponent } from "pages/search/actions/CovidActionComponent";
import { FluActionComponent } from "pages/search/actions/FluActionComponent";
import { CancerActionComponent } from "pages/search/actions/CancerActionComponent";

const routes: Routes = [
    { path: '', component: HomePageComponent },
    { path: 'overview', component: OverviewPageComponent },
    { path: 'search', component: SearchPageComponent },
    { path: 'covid19', component: Covid19ActionComponent },
    { path: 'flu', component: FluActionComponent },
    { path: 'cancer', component: CancerActionComponent },
    { path: 'annotations', loadChildren: 'pages/annotations/annotations.module#AnnotationsPageModule' },
    { path: 'motif', loadChildren: 'pages/motif/motif.module#MotifPageModule' },
    { path: 'about', loadChildren: 'pages/about/about.module#AboutPageModule' },
    { path: 'links', loadChildren: 'pages/links/links.module#LinksPageModule' },
    { path: 'credits', loadChildren: 'pages/credits/credits.module#CreditsPageModule' }
];

export const ApplicationRouting = RouterModule.forRoot(routes); // tslint:disable-line:variable-name

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

import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router/src/config';
import { AnnotationsPageComponent } from 'pages/annotations/annotations.component';
import { AnnotationsInfoComponent } from 'pages/annotations/info/annotations-info.component';
import { SampleItemResolver } from 'pages/annotations/resolvers/sample.resolver';
import { UserResolver } from 'pages/annotations/resolvers/user.resolver';
import { SampleChartComponent } from 'pages/annotations/sample/chart/sample-chart.component';
import { AnnotationsSampleComponent } from 'pages/annotations/sample/sample.component';
import { SampleTableComponent } from 'pages/annotations/sample/table/sample-table.component';

const routes: Routes = [
    {
        path:     '', component: AnnotationsPageComponent, resolve: { user: UserResolver },
        children: [
            { path: 'info', component: AnnotationsInfoComponent },
            { path: 'upload', loadChildren: 'pages/annotations/upload/upload.module#UploadModule' },
            {
                path:     'sample/:sample', component: AnnotationsSampleComponent, resolve: { sample: SampleItemResolver },
                children: [
                    { path: 'table', component: SampleTableComponent },
                    { path: 'chart', component: SampleChartComponent }
                ]
            },
            { path: 'multisample', loadChildren: 'pages/annotations/multisample/multisample.module#MultisamplePageModule' },
            { path: '**', redirectTo: 'info' }
        ]
    }
];

export const AnnotationsRouting = RouterModule.forChild(routes); // tslint:disable-line:variable-name

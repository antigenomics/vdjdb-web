/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router/src/config';
import { AnnotationsSampleComponent } from 'pages/annotations/sample/sample.component';
import { ModalsModule } from 'shared/modals/modals.module';
import { AnnotationsPageComponent } from './annotations.component';
import { AnnotationsService } from './annotations.service';
import { AnnotationsInfoComponent } from './info/annotations-info.component';
import { SampleItemResolver } from './resolvers/sample.resolver';
import { UserResolver } from './resolvers/user.resolver';
import { SampleChartComponent } from './sample/chart/sample-chart.component';
import { SampleModule } from './sample/sample.module';
import { SampleTableComponent } from './sample/table/sample-table.component';
import { AnnotationsSidebarComponent } from './sidebar/sidebar.component';
import { AnnotationsUploadComponent } from './upload/upload.component';
import { UploadModule } from './upload/upload.module';

const routes: Routes = [
    {
        path:     '', component: AnnotationsPageComponent, resolve: { user: UserResolver },
        children: [
            { path: 'info', component: AnnotationsInfoComponent },
            { path: 'upload', component: AnnotationsUploadComponent },
            {
                path:     'sample/:sample', component: AnnotationsSampleComponent, resolve: { sample: SampleItemResolver },
                children: [
                    { path: 'table', component: SampleTableComponent },
                    { path: 'chart', component: SampleChartComponent }
                ]
            },
            { path: '**', redirectTo: 'info' }
        ]
    }
];

@NgModule({
    imports:      [ CommonModule, UploadModule, RouterModule.forChild(routes), ModalsModule, SampleModule ],
    declarations: [ AnnotationsPageComponent, AnnotationsSidebarComponent, AnnotationsInfoComponent ],
    exports:      [ AnnotationsPageComponent ],
    providers:    [ AnnotationsService, UserResolver, SampleItemResolver ]
})
export class AnnotationsPageModule {}

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
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AnnotationsFiltersModule } from 'pages/annotations/filters/annotations-filters.module';
import { SampleChartModule } from 'pages/annotations/sample/chart/sample-chart.module';
import { AnnotationsSampleComponent } from 'pages/annotations/sample/sample.component';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { SampleTableModule } from 'pages/annotations/sample/table/sample-table.module';
import { ModalsModule } from 'shared/modals/modals.module';

@NgModule({
    imports:      [ CommonModule, FormsModule, RouterModule, ModalsModule, AnnotationsFiltersModule, SampleTableModule, SampleChartModule ],
    declarations: [ AnnotationsSampleComponent ],
    providers:    [ SampleService ]
})
export class SampleModule {

}

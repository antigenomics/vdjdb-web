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

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { SampleChartComponent } from 'pages/annotations/sample/chart/sample-chart.component';
import { SampleChartService } from 'pages/annotations/sample/chart/sample-chart.service';
import { SummaryChartComponent } from 'pages/annotations/sample/chart/summary/summary-chart.component';
import { ChartsModule } from 'shared/charts/charts.module';
import { ModalsModule } from 'shared/modals/modals.module';
import { TableModule } from 'shared/table/table.module';

@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule, ChartsModule ],
    declarations:    [ SampleChartComponent, SummaryChartComponent ],
    exports:         [ SampleChartComponent ],
    providers:       [ SampleChartService ]
})
export class SampleChartModule {

}

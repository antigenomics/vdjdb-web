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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MultisampleInfoComponent } from 'pages/annotations/multisample/info/multisample-info.component';
import { MultisampleRouting } from 'pages/annotations/multisample/multisample.routing';
import { MultisampleSummaryChartComponent } from 'pages/annotations/multisample/summary/chart/multisample-summary-chart.component';
import { MultisampleSummaryComponent } from 'pages/annotations/multisample/summary/multisample-summary.component';
import { MultisampleSummaryService } from 'pages/annotations/multisample/summary/multisample-summary.service';
import { SampleChartModule } from 'pages/annotations/sample/chart/sample-chart.module';
import { SampleModule } from 'pages/annotations/sample/sample.module';
import { ChartsModule } from 'shared/charts/charts.module';
import { ModalsModule } from 'shared/modals/modals.module';

@NgModule({
    imports:      [ CommonModule, ModalsModule, MultisampleRouting, SampleModule, SampleChartModule, ChartsModule ],
    declarations: [ MultisampleInfoComponent, MultisampleSummaryComponent, MultisampleSummaryChartComponent ],
    providers:    [ MultisampleSummaryService ]
})
export class MultisamplePageModule {}

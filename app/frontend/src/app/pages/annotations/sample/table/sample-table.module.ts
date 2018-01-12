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
import { RouterModule } from '@angular/router';
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { SampleChartComponent } from 'pages/annotations/sample/chart/sample-chart.component';
import { SampleChartService } from 'pages/annotations/sample/chart/sample-chart.service';
import { SummaryChartComponent } from 'pages/annotations/sample/chart/summary/summary-chart.component';
import { AnnotationsSampleComponent } from 'pages/annotations/sample/sample.component';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { IntersectionTableEntryCdr3aaComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-cdr3aa.component';
import { IntersectionTableEntryDetailsComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-details.component';
import { IntersectionTableEntryFrequencyComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-frequency.component';
import { IntersectionTableEntryTagsComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-tags.component';
import { IntersectionTableComponent } from 'pages/annotations/sample/table/intersection/intersection-table.component';
import { MatchesTableEntryAlignmentComponent } from 'pages/annotations/sample/table/intersection/matches/entry/matches-table-entry-alignment.component';
import { MatchesTableComponent } from 'pages/annotations/sample/table/intersection/matches/matches-table.component';
import { SampleTableComponent } from 'pages/annotations/sample/table/sample-table.component';
import { ChartsModule } from 'shared/charts/charts.module';
import { ModalsModule } from 'shared/modals/modals.module';
import { TableModule } from 'shared/table/table.module';

@NgModule({
    imports:         [ BrowserModule, ModalsModule, FormsModule, TableModule ],
    declarations:    [
        SampleTableComponent,
        IntersectionTableEntryFrequencyComponent,
        IntersectionTableEntryCdr3aaComponent,
        IntersectionTableEntryDetailsComponent,
        IntersectionTableEntryTagsComponent,
        MatchesTableComponent,
        MatchesTableEntryAlignmentComponent ],
    exports:         [ SampleTableComponent ],
    entryComponents: [
        IntersectionTableEntryFrequencyComponent,
        IntersectionTableEntryCdr3aaComponent,
        IntersectionTableEntryDetailsComponent,
        IntersectionTableEntryTagsComponent,
        MatchesTableComponent,
        MatchesTableEntryAlignmentComponent ]
})
export class SampleTableModule {}

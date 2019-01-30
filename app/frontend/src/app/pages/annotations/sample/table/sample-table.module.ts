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
import { IntersectionTableEntryCdr3aaComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-cdr3aa.component';
import { IntersectionTableEntryDetailsComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-details.component';
import { IntersectionTableEntryFrequencyComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-frequency.component';
import { IntersectionTableEntryTagsComponent } from 'pages/annotations/sample/table/intersection/entry/intersection-table-entry-tags.component';
import { MatchesTableEntryAlignmentComponent } from 'pages/annotations/sample/table/intersection/matches/entry/matches-table-entry-alignment.component';
import { MatchesTableEntryMatchScoreComponent } from 'pages/annotations/sample/table/intersection/matches/entry/matches-table-entry-match-score.component';
import { MatchesTableEntryWeightComponent } from 'pages/annotations/sample/table/intersection/matches/entry/matches-table-entry-weight.component';
import { MatchesTableComponent } from 'pages/annotations/sample/table/intersection/matches/matches-table.component';
import { SampleTableComponent } from 'pages/annotations/sample/table/sample-table.component';
import { ModalsModule } from 'shared/modals/modals.module';
import { TableModule } from 'shared/table/table.module';

@NgModule({
    imports:         [ CommonModule, ModalsModule, FormsModule, TableModule ],
    declarations:    [
        SampleTableComponent,
        IntersectionTableEntryFrequencyComponent,
        IntersectionTableEntryCdr3aaComponent,
        IntersectionTableEntryDetailsComponent,
        IntersectionTableEntryTagsComponent,
        MatchesTableComponent,
        MatchesTableEntryAlignmentComponent,
        MatchesTableEntryMatchScoreComponent,
        MatchesTableEntryWeightComponent ],
    exports:         [ SampleTableComponent ],
    entryComponents: [
        IntersectionTableEntryFrequencyComponent,
        IntersectionTableEntryCdr3aaComponent,
        IntersectionTableEntryDetailsComponent,
        IntersectionTableEntryTagsComponent,
        MatchesTableComponent,
        MatchesTableEntryAlignmentComponent,
        MatchesTableEntryMatchScoreComponent,
        MatchesTableEntryWeightComponent ]
})
export class SampleTableModule {}

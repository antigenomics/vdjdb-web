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
import { ModalsModule } from 'shared/modals/modals.module';
import { TableModule } from 'shared/table/table.module';
import { IntersectionTableEntryCdr3aaComponent } from './intersection/entry/intersection-table-entry-cdr3aa.component';
import { IntersectionTableEntryDetailsComponent } from './intersection/entry/intersection-table-entry-details.component';
import { IntersectionTableEntryFrequencyComponent } from './intersection/entry/intersection-table-entry-frequency.component';
import { IntersectionTableEntryTagsComponent } from './intersection/entry/intersection-table-entry-tags.component';
import { IntersectionTableFiltersComponent } from './intersection/filters/intersection-table-filters.component';
import { IntersectionTableComponent } from './intersection/intersection-table.component';
import { MatchesTableEntryAlignmentComponent } from './intersection/matches/entry/matches-table-entry-alignment.component';
import { MatchesTableComponent } from './intersection/matches/matches-table.component';
import { SampleTableComponent } from './sample-table.component';
import { SampleTableService } from './sample-table.service';

@NgModule({
    imports:         [ BrowserModule, ModalsModule, FormsModule, TableModule ],
    declarations:    [
        SampleTableComponent,
        IntersectionTableComponent,
        IntersectionTableFiltersComponent,
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
        MatchesTableEntryAlignmentComponent ],
    providers:       [ SampleTableService ]
})
export class SampleTableModule {

}

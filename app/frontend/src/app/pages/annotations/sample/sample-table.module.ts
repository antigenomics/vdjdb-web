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
import { ModalsModule } from '../../../shared/modals/modals.module';
import { SampleTableComponent } from './sample-table.component';
import { SampleTableService } from './sample-table.service';
import { IntersectionTableEntryCdr3aaComponent } from './table/entry/intersection-table-entry-cdr3aa.component';
import { IntersectionTableEntryDetailsComponent } from './table/entry/intersection-table-entry-details.component';
import { IntersectionTableEntryFrequencyComponent } from './table/entry/intersection-table-entry-frequency.component';
import { IntersectionTableEntryOriginalComponent } from './table/entry/intersection-table-entry-original.component';
import { IntersectionTableEntryTagsComponent } from './table/entry/intersection-table-entry-tags.component';
import { IntersectionTableFiltersComponent } from './table/filters/intersection-table-filters.component';
import { IntersectionTableComponent } from './table/intersection-table.component';
import { IntersectionTableRowComponent } from './table/row/intersection-table-row.component';

@NgModule({
    imports:         [ BrowserModule, ModalsModule, FormsModule ],
    declarations:    [
        SampleTableComponent,
        IntersectionTableComponent,
        IntersectionTableFiltersComponent,
        IntersectionTableRowComponent,
        IntersectionTableEntryOriginalComponent,
        IntersectionTableEntryFrequencyComponent,
        IntersectionTableEntryCdr3aaComponent,
        IntersectionTableEntryDetailsComponent,
        IntersectionTableEntryTagsComponent ],
    exports:         [ SampleTableComponent ],
    entryComponents: [
        IntersectionTableEntryOriginalComponent,
        IntersectionTableEntryFrequencyComponent,
        IntersectionTableEntryCdr3aaComponent,
        IntersectionTableEntryDetailsComponent,
        IntersectionTableEntryTagsComponent ],
    providers:       [ SampleTableService ]
})
export class SampleTableModule {

}

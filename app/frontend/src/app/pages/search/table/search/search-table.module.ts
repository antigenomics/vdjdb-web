/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltersModule } from 'shared/filters/filters.module';
import { ModalsModule } from 'shared/modals/modals.module';
import { TableModule } from 'shared/table/table.module';
import { SearchTableEntryCdrComponent } from './entry/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from './entry/search-table-entry-gene.component';
import { SearchTableEntryMetaComponent } from './entry/search-table-entry-meta.component';
import { SearchTableEntryUrlComponent } from './entry/search-table-entry-url.component';
import { SearchTableComponent } from './search-table.component';
import { SearchTableService } from './search-table.service';

@NgModule({
    imports:         [ CommonModule, FormsModule, ModalsModule, FiltersModule, TableModule ],
    declarations:    [ SearchTableComponent,
        SearchTableEntryMetaComponent,
        SearchTableEntryUrlComponent,
        SearchTableEntryGeneComponent,
        SearchTableEntryCdrComponent ],
    exports:         [ SearchTableComponent ],
    entryComponents: [ SearchTableEntryMetaComponent,
        SearchTableEntryUrlComponent,
        SearchTableEntryGeneComponent,
        SearchTableEntryCdrComponent ],
    providers:       [ SearchTableService ]
})
export class SearchTableModule {
}

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

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from '../../../../shared/filters/filters.module';
import { ModalsModule } from '../../../../shared/modals/modals.module';
import { SearchTableEntryCdrComponent } from './entry/cdr/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from './entry/gene/search-table-entry-gene.component';
import { SearchTableEntryJsonComponent } from './entry/json/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from './entry/original/search-table-entry-original.component';
import { SearchTableEntryUrlComponent } from './entry/url/search-table-entry-url.component';
import { SearchTableExportComponent } from './export/search-table-export.component';
import { SearchTableInfoComponent } from './info/search-table-info.component';
import { SearchTablePagesizeComponent } from './pagesize/search-table-pagesize.component';
import { SearchTablePaginationComponent } from './pagination/search-table-pagination.component';
import { SearchTableRowComponent } from './row/search-table-row.component';
import { SearchTableComponent } from './search-table.component';
import { SearchTableService } from './search-table.service';

@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule, FiltersModule ],
    declarations:    [  SearchTableComponent,
                        SearchTablePaginationComponent,
                        SearchTableInfoComponent,
                        SearchTableExportComponent,
                        SearchTablePagesizeComponent,
                        SearchTableRowComponent,
                        SearchTableEntryOriginalComponent,
                        SearchTableEntryJsonComponent,
                        SearchTableEntryUrlComponent,
                        SearchTableEntryGeneComponent,
                        SearchTableEntryCdrComponent ],
    exports:         [  SearchTableComponent ],
    entryComponents: [  SearchTableRowComponent,
                        SearchTableEntryOriginalComponent,
                        SearchTableEntryJsonComponent,
                        SearchTableEntryUrlComponent,
                        SearchTableEntryGeneComponent,
                        SearchTableEntryCdrComponent ],
    providers:       [ SearchTableService ]
})
export class SearchTableModule {}

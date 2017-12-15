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
import { BrowserModule } from '@angular/platform-browser';
import { ModalsModule } from '../modals/modals.module';
import { TableEntryCenteredComponent } from './entry/table-entry-centered.component';
import { TableEntryDefaultComponent } from './entry/table-entry-default.component';
import { TableExportComponent } from './export/table-export.component';
import { TableInfoComponent } from './info/table-info.component';
import { TablePagesizeComponent } from './pagesize/table-pagesize.component';
import { TablePaginationComponent } from './pagination/table-pagination.component';
import { TableRowComponent } from './row/table-row.component';
import { TableComponent } from './table.component';

@NgModule({
    imports:         [ BrowserModule, ModalsModule ],
    declarations:    [ TableComponent,
        TableRowComponent,
        TablePaginationComponent,
        TableInfoComponent,
        TableExportComponent,
        TablePagesizeComponent,
        TableEntryDefaultComponent,
        TableEntryCenteredComponent ],
    exports:         [ TableComponent,
        TablePaginationComponent,
        TableInfoComponent,
        TableExportComponent,
        TablePagesizeComponent ],
    entryComponents: [ TableEntryDefaultComponent, TableEntryCenteredComponent, TableRowComponent ]
})
export class TableModule {
}

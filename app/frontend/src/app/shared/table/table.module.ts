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
import { TableExportComponent } from './export/table-export.component';
import { TableInfoComponent } from './info/table-info.component';
import { TablePagesizeComponent } from './pagesize/table-pagesize.component';
import { TablePaginationComponent } from './pagination/table-pagination.component';

@NgModule({
    imports:      [ BrowserModule ],
    declarations: [ TablePaginationComponent, TableInfoComponent, TableExportComponent, TablePagesizeComponent ],
    exports:      [ TablePaginationComponent, TableInfoComponent, TableExportComponent, TablePagesizeComponent ]
})
export class TableModule {}

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
import { RefSearchPageRouting } from 'pages/refsearch/refsearch.routing';
import { FiltersModule } from 'shared/filters/filters.module';
import { RefSearchPageComponent } from './refsearch.component';
import { RefSearchService } from './refsearch.service';
import { RefSearchPageFiltersComponent } from './refsearch_filters/refsearch-filters.component';
import { RefSearchPageTableComponent } from './refsearch_table/refsearch-table.component';
import { RefSearchPageTableRowComponent } from './refsearch_table_row/refsearch-table-row.component';

@NgModule({
  imports:      [ CommonModule, FiltersModule, RefSearchPageRouting ],
  declarations: [ RefSearchPageComponent, RefSearchPageFiltersComponent, RefSearchPageTableComponent, RefSearchPageTableRowComponent ],
  providers:    [ RefSearchService ]
})
export class RefSearchPageModule {}

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
import { FiltersModule } from 'shared/filters/filters.module';
import { SearchInfoComponent } from './info/search-info.component';
import { SearchPageComponent } from './search.component';
import { SearchTableModule } from './table/search/search-table.module';
import { Covid19ActionComponent } from "pages/search/actions/CovidActionComponent";
import { FluActionComponent } from "pages/search/actions/FluActionComponent";
import { SearchInfoService } from "pages/search/info/search-info.service";

@NgModule({
  imports:      [ CommonModule, SearchTableModule, FiltersModule ],
  declarations: [ SearchPageComponent, SearchInfoComponent, Covid19ActionComponent, FluActionComponent ],
  exports:      [ SearchPageComponent, SearchInfoComponent, Covid19ActionComponent, FluActionComponent ],
  providers:    [ SearchInfoService ]
})
export class SearchPageModule {}

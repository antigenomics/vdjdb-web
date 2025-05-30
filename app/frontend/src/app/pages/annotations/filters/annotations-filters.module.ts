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
import { AnnotationsFiltersComponent } from 'pages/annotations/filters/annotations-filters.component';
import { DatabaseQueryParamsComponent } from 'pages/annotations/filters/general/database_query_params/database-query-params.component';
import { SearchScopeComponent } from 'pages/annotations/filters/general/search_scope/search-scope.component';
import { ScoringTypeComponent } from 'pages/annotations/filters/scoring/scoring_type/scoring-type.component';
import { ScoringVDJMatchComponent } from 'pages/annotations/filters/scoring/scoring_vdjmatch/scoring-vdjmatch.component';
import { FiltersCommonModule } from 'shared/filters/common/filters-common.module';
import { ModalsModule } from 'shared/modals/modals.module';

@NgModule({
  imports:      [ CommonModule, FormsModule, ModalsModule, FiltersCommonModule ],
  declarations: [ AnnotationsFiltersComponent, DatabaseQueryParamsComponent, SearchScopeComponent, ScoringTypeComponent, ScoringVDJMatchComponent ],
  exports:      [ AnnotationsFiltersComponent ]
})
export class AnnotationsFiltersModule {}

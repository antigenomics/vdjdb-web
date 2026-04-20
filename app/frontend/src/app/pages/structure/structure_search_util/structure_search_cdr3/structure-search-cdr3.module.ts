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
import { StructureSearchCDR3Component } from 'pages/structure/structure_search_util/structure_search_cdr3/structure-search-cdr3.component';
import { ModalsModule } from 'shared/modals/modals.module';

@NgModule({
  imports:      [ CommonModule, FormsModule, ModalsModule ],
  declarations: [ StructureSearchCDR3Component ],
  exports:      [ StructureSearchCDR3Component ]

})
export class StructureSearchCDR3Module {}

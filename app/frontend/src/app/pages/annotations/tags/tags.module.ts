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
import { TagsTableRowComponent } from 'pages/annotations/tags/table/row/tags-table-row.component';
import { TagsTableComponent } from 'pages/annotations/tags/table/tags-table.component';
import { TagsComponent } from 'pages/annotations/tags/tags.component';
import { AnnotationsTagsRouting } from 'pages/annotations/tags/tags.routing';
import { TagsService } from 'pages/annotations/tags/tags.service';
import { ColorpickerModule } from 'shared/colorpicker/colorpicker.module';
import { FiltersCommonModule } from 'shared/filters/common/filters-common.module';

@NgModule({
  imports:      [ CommonModule, FormsModule, ColorpickerModule, FiltersCommonModule, AnnotationsTagsRouting ],
  declarations: [ TagsComponent, TagsTableComponent, TagsTableRowComponent ],
  providers:    [ TagsService ]
})
export class TagsPageModule {
}

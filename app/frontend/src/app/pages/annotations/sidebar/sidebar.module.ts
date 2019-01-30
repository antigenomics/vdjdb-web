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
import { AnnotationsSidebarComponent } from 'pages/annotations/sidebar/sidebar.component';
import { SortModalComponent } from 'pages/annotations/sidebar/sort_modal/sort-modal.component';
import { UpdateSampleModalComponent } from 'pages/annotations/sidebar/update_sample_modal/update-sample-modal.component';
import { ModalsModule } from 'shared/modals/modals.module';

@NgModule({
    imports:      [ CommonModule, ModalsModule, FormsModule ],
    declarations: [ AnnotationsSidebarComponent, UpdateSampleModalComponent, SortModalComponent ],
    exports:      [ AnnotationsSidebarComponent ]
})
export class AnnotationsSidebarModule {

}

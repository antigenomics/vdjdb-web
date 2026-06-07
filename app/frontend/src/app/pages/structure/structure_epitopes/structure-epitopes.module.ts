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
import { StructureEpitopeEntryModule } from 'pages/structure/structure_epitope_entry/structure-epitope-entry.module';
import { StructureEpitopesComponent } from './structure-epitopes.component';

@NgModule({
    imports:      [ CommonModule, StructureEpitopeEntryModule ],
    declarations: [ StructureEpitopesComponent ],
    exports:      [ StructureEpitopesComponent ]
})
export class StructureEpitopesModule {}

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
import { StructurePageComponent } from 'pages/structure/structure.component';
import { StructurePageRouting } from 'pages/structure/structure.routing';
import { StructureService } from 'pages/structure/structure.service';
import { StructureCDR3ClustersComponent } from 'pages/structure/structure_cdr3_clusters/structure-cdr3-clusters.component';
import { StructureContextHeaderComponent } from 'pages/structure/structure_context_header/structure-context-header.component';
import { StructureEpitopeClusterComponent } from 'pages/structure/structure_epitope_cluster/structure-epitope-cluster.component';
import { StructureEpitopeEntryComponent } from 'pages/structure/structure_epitope_entry/structure-epitope-entry.component';
import { ModalsModule } from 'shared/modals/modals.module';

/**
 * One module for the page.
 *
 * There used to be six, one per component, each declaring and exporting exactly one thing and none
 * of them lazily loaded - so the split bought nothing at runtime and cost a file, an export list and
 * an import edge every time a component moved. The page is loaded as a unit either way; the route is
 * where the laziness lives.
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ModalsModule,
    StructurePageRouting
  ],
  declarations: [
    StructurePageComponent,
    StructureContextHeaderComponent,
    StructureEpitopeEntryComponent,
    StructureEpitopeClusterComponent,
    StructureCDR3ClustersComponent
  ],
  exports:   [ StructurePageComponent ],
  providers: [ StructureService ]
})
export class StructurePageModule {}

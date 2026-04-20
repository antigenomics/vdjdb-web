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
import { StructurePageComponent } from 'pages/structure/structure.component';
import { StructurePageRouting } from 'pages/structure/structure.routing';
import { StructureService } from 'pages/structure/structure.service';
import { StructureCDR3ClustersModule } from 'pages/structure/structure_cdr3_clusters/structure-cdr3-clusters.module';
import { StructureContextHeaderModule } from 'pages/structure/structure_context_header/structure-context-header.module';
import { StructureEpitopesModule } from 'pages/structure/structure_epitopes/structure-epitopes.module';

@NgModule({
  imports: [
    CommonModule,
    StructurePageRouting,
    StructureContextHeaderModule,
    StructureEpitopesModule,
    StructureCDR3ClustersModule
  ],
  declarations: [ StructurePageComponent ],
  exports: [ StructurePageComponent ],
  providers: [ StructureService ]
})
export class StructurePageModule {}

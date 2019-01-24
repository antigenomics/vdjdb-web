/*
 *     Copyright 2017-2018 Bagaev Dmitry
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
import { MotifEpitopeClusterComponent } from 'pages/motif/motif_epitope_cluster/motif-epitope-cluster.component';
import { ChartsModule } from 'shared/charts/charts.module';

@NgModule({
  imports:      [ CommonModule, ChartsModule ],
  declarations: [ MotifEpitopeClusterComponent ],
  exports:      [ MotifEpitopeClusterComponent ]
})
export class MotifEpitopeClusterModule {}
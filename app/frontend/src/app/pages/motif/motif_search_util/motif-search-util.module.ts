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
import { MotifSearchUtilComponent } from 'pages/motif/motif_search_util/motif-search-util.component';
import { MotifSearchCDR3Module } from 'pages/motif/motif_search_util/motif_search_cdr3/motif-search-cdr3.module';
import { MotifSearchTreeModule } from 'pages/motif/motif_search_util/motif_search_tree/motif-search-tree.module';
import { MotifViewOptionsModule } from 'pages/motif/motif_view_options/motif-view-options.module';

@NgModule({
  imports:      [ CommonModule, MotifSearchTreeModule, MotifSearchCDR3Module, MotifViewOptionsModule ],
  declarations: [ MotifSearchUtilComponent ],
  exports:      [ MotifSearchUtilComponent ]
})
export class MotifSearchUtilModule {

}
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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  IStructureCDR3SearchResultOptions,
  IStructureEpitopeViewOptions,
  IStructuresMetadata,
  IStructuresMetadataTreeLevelValue
} from 'pages/structure/structure';
import { StructureSearchState, StructureService } from 'pages/structure/structure.service';

@Component({
  selector:        'structure-search-util',
  templateUrl:     './structure-search-util.component.html',
  styleUrls:       [ './structure-search-util.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureSearchUtilComponent {

  @Input('metadata')
  public metadata: IStructuresMetadata;

  @Input('selected')
  public selected: IStructuresMetadataTreeLevelValue[];

  @Input('options')
  public options: IStructureEpitopeViewOptions;

  @Input('cdr3SearchOptions')
  public cdr3SearchOptions: IStructureCDR3SearchResultOptions;

  constructor(private structureService: StructureService) {}

  public setStateSearchTree(): void {
    this.structureService.setSearchState(StructureSearchState.SEARCH_TREE);
  }

  public setStateSearchCDR3(): void {
    this.structureService.setSearchState(StructureSearchState.SEARCH_CDR3);
  }

  public isStateSearchTree(): boolean {
    return this.structureService.getSearchState() === StructureSearchState.SEARCH_TREE;
  }

  public isStateSearchCDR3(): boolean {
    return this.structureService.getSearchState() === StructureSearchState.SEARCH_CDR3;
  }
}

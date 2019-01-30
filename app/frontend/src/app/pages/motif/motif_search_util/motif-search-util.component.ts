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
import { MotifEpitopeViewOptions, MotifsMetadata, MotifsMetadataTreeLevelValue } from 'pages/motif/motif';
import { MotifSearchState, MotifService } from 'pages/motif/motif.service';

@Component({
  selector:        'motif-search-util',
  templateUrl:     './motif-search-util.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchUtilComponent {

  @Input('metadata')
  public metadata: MotifsMetadata;

  @Input('selected')
  public selected: MotifsMetadataTreeLevelValue[];

  @Input('options')
  public options: MotifEpitopeViewOptions;

  @Input('cdr3')
  public cdr3: string;

  constructor(private motifService: MotifService) {}

  public setStateSearchTree(): void {
    this.motifService.setSearchState(MotifSearchState.SEARCH_TREE);
  }

  public setStateSearchCDR3(): void {
    this.motifService.setSearchState(MotifSearchState.SEARCH_CDR3);
  }

  public isStateSearchTree(): boolean {
    return this.motifService.getSearchState() === MotifSearchState.SEARCH_TREE;
  }

  public isStateSearchCDR3(): boolean {
    return this.motifService.getSearchState() === MotifSearchState.SEARCH_CDR3;
  }

  public onOptionsChange(options: MotifEpitopeViewOptions): void {
    this.motifService.setOptions(options);
  }
}
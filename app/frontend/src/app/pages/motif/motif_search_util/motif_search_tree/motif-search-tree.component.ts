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
import { MotifsMetadata, MotifsMetadataTreeLevelValue, MotifsSearchTreeFilter } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';

@Component({
  selector:        'motif-search-tree',
  templateUrl:     './motif-search-tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchTreeComponent {
  @Input('metadata')
  public metadata: MotifsMetadata;

  @Input('selected')
  public selected: MotifsMetadataTreeLevelValue[];

  constructor(private motifService: MotifService) {}

  public onFilterReceived(filter: MotifsSearchTreeFilter): void {
    this.motifService.select(filter);
  }

  public onDiscardReceived(filter: MotifsSearchTreeFilter): void {
    this.motifService.discard(filter);
  }

  public isSelectedExist(): boolean {
    return this.selected && this.selected.length !== 0;
  }

  public discardAll(): void {
    this.selected.forEach((s) => this.motifService.discardTreeLevelValue(s));
    this.motifService.updateSelected();
    setTimeout(() => {
      this.motifService.updateEpitopes();
    });
  }

  public hideAll(): void {
    this.motifService.fireHideEvent();
  }
}
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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MotifEpitopeViewOptions, MotifsMetadataTreeLevelValue } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';

@Component({
  selector:        'motif-view-options',
  templateUrl:     './motif-view-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifViewOptionsComponent {
  @Input('options')
  public options: MotifEpitopeViewOptions;

  @Output('onOptionsChange')
  public onOptionsChange = new EventEmitter<MotifEpitopeViewOptions>();

  @Input('selected')
  public selected: MotifsMetadataTreeLevelValue[];

  constructor(private motifService: MotifService) {}

  public normalize(): void {
    this.onOptionsChange.emit({ ...this.options, isNormalized: !this.options.isNormalized });
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
}
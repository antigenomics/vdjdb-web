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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MotifEpitope, MotifEpitopeViewOptions } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';
import { take } from 'rxjs/operators';

@Component({
  selector:        'motif-epitopes',
  templateUrl:     './motif-epitopes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifEpitopesComponent {
  @Input('options')
  public options: MotifEpitopeViewOptions;

  @Input('epitopes')
  public epitopes: MotifEpitope[];

  constructor(private motifService: MotifService) {}

  public onEpitopeDiscard(epitope: MotifEpitope): void {
    this.motifService.findTreeLevelValue(epitope.epitope).pipe(take(1)).subscribe((values) => {
      values.forEach((value) => {
        this.motifService.discardTreeLevelValue(value);
      });
      this.motifService.updateSelected();
      setImmediate(() => {
        this.motifService.updateEpitopes();
      });
    });
  }
}
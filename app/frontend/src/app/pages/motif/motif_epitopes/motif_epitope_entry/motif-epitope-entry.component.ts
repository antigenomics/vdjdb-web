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
import { MotifEpitope } from 'pages/motif/motif';

@Component({
  selector:        'motif-epitope-entry',
  templateUrl:     './motif-epitope-entry.component.html',
  styleUrls:       [ './motif-epitope-entry.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifEpitopeEntryComponent {
  @Input('epitope')
  public epitope: MotifEpitope;

  @Input('isNormalized')
  public isNormalized: boolean;

  @Output('onDiscard')
  public onDiscard = new EventEmitter<MotifEpitope>();

  public discard(): void {
    this.onDiscard.emit(this.epitope);
  }
}
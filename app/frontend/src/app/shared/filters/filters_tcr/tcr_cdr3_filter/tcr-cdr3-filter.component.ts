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

import { ChangeDetectorRef, Component } from '@angular/core';
import { TCRFiltersService } from '../tcr-filters.service';

@Component({
  selector:    'tcr-cdr3-filter',
  templateUrl: './tcr-cdr3-filter.component.html'
})
export class TCRcdr3FilterComponent {
  constructor(public tcr: TCRFiltersService, private changeDetector: ChangeDetectorRef) {}

  public checkRangeInput(key: string, input: number, min: number, max: number): void {
    // Read the field before the repaint dance below overwrites it: the budget this field may still
    // claim depends on what the other two already hold.
    const effectiveMax = Math.max(min, this.tcr.cdr3.getRemainingBudgetFor(this.readField(key), max));

    // Bounce through -1 so Angular always sees a change. [ngModel] here is one-way, so when the
    // clamped value equals the one already in the model there is no diff and the text the user
    // typed (a 9, say) stays in the DOM.
    this.writeField(key, -1);
    this.changeDetector.detectChanges();

    let value = 0;
    if (isNaN(Number(input)) || input === null || input === undefined) {
      value = min;
    } else if (input < min) {
      value = min;
    } else if (input > effectiveMax) {
      value = effectiveMax;
    } else {
      value = input;
    }

    this.writeField(key, value);
    this.changeDetector.detectChanges();
  }

  private readField(key: string): number {
    switch (key) {
      case 'levenshteinSubstitutions': return this.tcr.cdr3.levenshteinSubstitutions;
      case 'levenshteinInsertions':    return this.tcr.cdr3.levenshteinInsertions;
      case 'levenshteinDeletions':     return this.tcr.cdr3.levenshteinDeletions;
      default:                         return 0;
    }
  }

  private writeField(key: string, value: number): void {
    switch (key) {
      case 'levenshteinSubstitutions': this.tcr.cdr3.levenshteinSubstitutions = value; break;
      case 'levenshteinInsertions':    this.tcr.cdr3.levenshteinInsertions = value; break;
      case 'levenshteinDeletions':     this.tcr.cdr3.levenshteinDeletions = value; break;
      default: break;
    }
  }
}

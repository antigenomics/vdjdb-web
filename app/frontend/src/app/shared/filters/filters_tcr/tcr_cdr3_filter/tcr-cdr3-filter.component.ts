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
    switch (key) {
      case 'levenshteinSubstitutions':
        this.tcr.cdr3.levenshteinSubstitutions = -1;
        break;
      case 'levenshteinInsertions':
        this.tcr.cdr3.levenshteinInsertions = -1;
        break;
      case 'levenshteinDeletions':
        this.tcr.cdr3.levenshteinDeletions = -1;
        break;
      default:
        break;
    }
    this.changeDetector.detectChanges();
    let value = 0;
    if (isNaN(Number(input)) || input === null || input === undefined) {
      value = min;
    } else if (input < min) {
      value = min;
    } else if (input > max) {
      value = max;
    } else {
      value = input;
    }
    switch (key) {
      case 'levenshteinSubstitutions':
        this.tcr.cdr3.levenshteinSubstitutions = value;
        break;
      case 'levenshteinInsertions':
        this.tcr.cdr3.levenshteinInsertions = value;
        break;
      case 'levenshteinDeletions':
        this.tcr.cdr3.levenshteinDeletions = value;
        break;
      default:
        break;
    }
    this.changeDetector.detectChanges();
  }
}

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
import { MetaFiltersService } from '../meta-filters.service';

@Component({
  selector:    'meta-reliability-filter',
  templateUrl: './meta-reliability-filter.component.html'
})
export class MetaReliabilityFilterComponent {
  constructor(public meta: MetaFiltersService, private changeDetector: ChangeDetectorRef) {}

  public checkConfidenceScore(score: number): void {
    this.meta.reliability.minimalConfidenceScore = -1;
    this.changeDetector.detectChanges();
    if (isNaN(Number(score)) || score === null || score === undefined) {
      this.meta.reliability.minimalConfidenceScore = this.meta.reliability.confidenceScoreMin;
    } else if (score > this.meta.reliability.confidenceScoreMax) {
      this.meta.reliability.minimalConfidenceScore = this.meta.reliability.confidenceScoreMax;
    } else if (score < this.meta.reliability.confidenceScoreMin) {
      this.meta.reliability.minimalConfidenceScore = this.meta.reliability.confidenceScoreMin;
    } else {
      this.meta.reliability.minimalConfidenceScore = score;
    }
    this.changeDetector.detectChanges();
  }
}

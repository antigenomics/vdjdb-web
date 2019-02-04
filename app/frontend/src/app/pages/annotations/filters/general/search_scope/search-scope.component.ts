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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { environment } from 'environments/environment';
import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';

@Component({
  selector:        'search-scope',
  templateUrl:     './search-scope.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchScopeComponent {
  @Input('filters')
  public filters: AnnotationsFilters;

  @Input('disabled')
  public disabled: boolean;

  constructor(private changeDetector: ChangeDetectorRef) {}

  public isDisabled() {
    return this.disabled ? true : undefined;
  }

  public isIndelsAllowed(): boolean {
    return environment.application.annotations.filters.hammingDistance.allowIndels;
  }

  public checkHammingDistance(distance: number, type: string): void {
    const hammingDistance = this.filters.searchScope.hammingDistance as any;
    hammingDistance[ type ] = -1;
    this.changeDetector.detectChanges();
    hammingDistance[ type ] = this.filters.validateRange(AnnotationsFilters.hammingDistanceRange, distance);
    if (!this.isIndelsAllowed()) {
      hammingDistance.total = hammingDistance.substitutions;
    }
    this.changeDetector.detectChanges();
  }
}

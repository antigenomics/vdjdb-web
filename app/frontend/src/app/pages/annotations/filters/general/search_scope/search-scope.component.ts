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
import { AnnotationsFilters, ISearchScopeHammingDistance } from 'pages/annotations/filters/annotations-filters';

// The only two searches offered. Mirrors AnnotationsSearchScopeHammingDistance.Hamming / .Levenshtein,
// which the server snaps any incoming scope onto - the numbers have to agree or the UI will show a
// selection the server did not run.
//
// total = 1 in the Levenshtein case is what makes it *one* edit of any kind, rather than one
// substitution plus one insertion plus one deletion.
const HAMMING: ISearchScopeHammingDistance = { substitutions: 1, insertions: 0, deletions: 0, total: 1 };
const LEVENSHTEIN: ISearchScopeHammingDistance = { substitutions: 1, insertions: 1, deletions: 1, total: 1 };

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

  public isDisabled() {
    return this.disabled ? true : undefined;
  }

  public isLevenshtein(): boolean {
    const d = this.filters.searchScope.hammingDistance;
    return d.insertions > 0 || d.deletions > 0;
  }

  public setLevenshtein(enabled: boolean): void {
    this.filters.searchScope.hammingDistance = { ...(enabled ? LEVENSHTEIN : HAMMING) };
  }
}

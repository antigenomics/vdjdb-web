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

// The four searches offered. Mirrors AnnotationsSearchScopeHammingDistance.Exact / .Hamming /
// .Hamming2 / .Levenshtein, which the server snaps any incoming scope onto - the numbers have to
// agree or the UI will show a selection the server did not run.
//
// total = 1 in the Levenshtein case is what makes it *one* edit of any kind, rather than one
// substitution plus one insertion plus one deletion.
const EXACT: ISearchScopeHammingDistance = { substitutions: 0, insertions: 0, deletions: 0, total: 0 };
const HAMMING: ISearchScopeHammingDistance = { substitutions: 1, insertions: 0, deletions: 0, total: 1 };
const HAMMING2: ISearchScopeHammingDistance = { substitutions: 2, insertions: 0, deletions: 0, total: 2 };
const LEVENSHTEIN: ISearchScopeHammingDistance = { substitutions: 1, insertions: 1, deletions: 1, total: 1 };

export type SearchScopeMode = 'exact' | 'hamming1' | 'hamming2' | 'levenshtein';

const SCOPES: { [ mode: string ]: ISearchScopeHammingDistance } = {
  exact: EXACT, hamming1: HAMMING, hamming2: HAMMING2, levenshtein: LEVENSHTEIN
};

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

  /**
   * Which of the four is selected, derived from the tuple rather than stored alongside it.
   *
   * Deriving keeps one source of truth: the tuple is what is sent, so a stored mode could disagree
   * with it after a session restore or a hand-built request. The fallback mirrors the server's
   * `sanitize` - anything unrecognised reads as the nearest preset rather than leaving every radio
   * blank.
   */
  public mode(): SearchScopeMode {
    const d = this.filters.searchScope.hammingDistance;
    if (d.insertions > 0 || d.deletions > 0) {
      return 'levenshtein';
    } else if (d.substitutions <= 0 || d.total <= 0) {
      return 'exact';
    } else if (d.substitutions === 1 || d.total === 1) {
      return 'hamming1';
    }
    return 'hamming2';
  }

  public isMode(mode: SearchScopeMode): boolean {
    return this.mode() === mode;
  }

  public setMode(mode: SearchScopeMode): void {
    this.filters.searchScope.hammingDistance = { ...SCOPES[ mode ] };
  }
}

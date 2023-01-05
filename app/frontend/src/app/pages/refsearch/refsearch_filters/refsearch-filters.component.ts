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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RefSearchService } from 'pages/refsearch/refsearch.service';
import { SetEntry } from 'shared/filters/common/set/set-entry';
import { Observable } from 'rxjs';

@Component({
  selector:        'refsearch-filters',
  templateUrl:     './refsearch-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefSearchPageFiltersComponent {

  public get cdr3(): Observable<SetEntry[]> {
    return this.refsearch.getCDR3Filter();
  }

  public get epitope(): Observable<SetEntry[]> {
    return this.refsearch.getEpitopeFilter();
  }

  public get searchByAntigen(): Observable<boolean> {
    return this.refsearch.getExtraSearchByAntigenFilter();
  }

  public get filterStopWords(): Observable<boolean> {
    return this.refsearch.getExtraFilterStopWordsFilter();
  }

  public get species(): Observable<SetEntry[]> {
    return this.refsearch.getSpeciesToSearchFilter();
  }

  constructor(private refsearch: RefSearchService) {}

  public updateCDR3(cdr3: SetEntry[]) {
    this.refsearch.updateCDR3(cdr3)
  }

  public updateEpitope(epitope: SetEntry[]) {
    this.refsearch.updateEpitope(epitope)
  }

  public updateSpecies(species: SetEntry[]) {
    this.refsearch.updateSpecies(species)
  }

  public updateSearchByAntigen(flag: boolean): void {
    this.refsearch.updateExtraSearchByAntigen(flag);
  }

  public updateFilterStopWords(flag: boolean): void {
      this.refsearch.updateExtraFilterStopWords(flag);
  }

}

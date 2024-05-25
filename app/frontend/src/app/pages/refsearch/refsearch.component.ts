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
import { Observable } from 'rxjs';
import { RefSearchTableRow } from './refsearch';
import { RefSearchBackendState, RefSearchService } from './refsearch.service';

@Component({
  selector:        'refsearch',
  templateUrl:     './refsearch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefSearchPageComponent {

  get isAlive(): Observable<RefSearchBackendState> {
    return this.refsearch.isAlive();
  }

  get isLoading(): Observable<boolean> {
    return this.refsearch.isLoading();
  }

  get error(): Observable<string | undefined> {
    return this.refsearch.getError();
  }

  get rows(): Observable<RefSearchTableRow[] | undefined> {
    return this.refsearch.getRows();
  }

  constructor(private refsearch: RefSearchService) {}

  public search(): void {
    this.refsearch.search()
  }

  public reset(): void {
    this.refsearch.reset()
  }

}

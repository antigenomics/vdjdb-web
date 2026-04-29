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

import { Component, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { FiltersService, FiltersServiceEventType } from 'shared/filters/filters.service';
import { AGFiltersService } from 'shared/filters/filters_ag/ag-filters.service';
import { MetaFiltersService } from 'shared/filters/filters_meta/meta-filters.service';
import { MHCFiltersService } from 'shared/filters/filters_mhc/mhc-filters.service';
import { TCRFiltersService } from 'shared/filters/filters_tcr/tcr-filters.service';
import { SearchInfoService } from 'pages/search/info/search-info.service';
import { map } from 'rxjs/operators';

@Component({
  selector:    'search-info',
  templateUrl: './search-info.component.html',
  styles: [`
    .ag-filter-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "origin  epitope"
        "diseases epitope";
      width: 100%;
      flex-wrap: unset !important;
    }
    .ag-origin-col, .ag-epitope-col, .ag-diseases-col {
      padding: 1em 1em;
      width: auto !important;
      min-width: 0;
    }
    .ag-origin-col   { grid-area: origin; }
    .ag-epitope-col  { grid-area: epitope; }
    .ag-diseases-col { grid-area: diseases; align-self: start; }
    @media (max-width: 767px) {
      .ag-filter-grid {
        grid-template-columns: 1fr;
        grid-template-areas:
          "origin"
          "epitope"
          "diseases";
      }
    }
    .filter-changed-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background-color: #db2828;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .filter-tab-dot {
      position: absolute;
      right: 6px;
      width: 7px;
      height: 7px;
      background-color: #db2828;
      border-radius: 50%;
    }
    .filter-changed-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #db2828;
      font-size: 0.9em;
    }
  `]
})
export class SearchInfoComponent implements OnDestroy {
  private _resetEvent: Subscription;

  constructor(
    private filters: FiltersService,
    private tcr: TCRFiltersService,
    private ag: AGFiltersService,
    private mhc: MHCFiltersService,
    private meta: MetaFiltersService,
    private info: SearchInfoService
  ) {
    this._resetEvent = this.filters.getEvents().subscribe((_event: FiltersServiceEventType) => {});
  }

  public isCurrentState(state: string): Observable<boolean> {
    return this.info.state.pipe(map((s: string) => s === state));
  }

  public setCurrentState(state: string): void {
    this.info.state.next(state);
  }

  public hasCdr3Changes(): boolean {
    return !this.tcr.isDefault();
  }

  public hasAgChanges(): boolean {
    return !this.ag.isDefault();
  }

  public hasMhcChanges(): boolean {
    return !this.mhc.isDefault();
  }

  public hasMetaChanges(): boolean {
    return !this.meta.isDefault();
  }

  public hasAnyChanges(): boolean {
    return this.hasCdr3Changes() || this.hasAgChanges() || this.hasMhcChanges() || this.hasMetaChanges();
  }

  public ngOnDestroy() {
    this._resetEvent.unsubscribe();
  }
}

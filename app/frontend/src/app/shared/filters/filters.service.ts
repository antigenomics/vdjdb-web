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

import { EventEmitter, Injectable } from '@angular/core';
import { Filter, FilterInterface, IFilter, IFiltersOptions } from './filters';
import { AGFiltersService } from './filters_ag/ag-filters.service';
import { MetaFiltersService } from './filters_meta/meta-filters.service';
import { MHCFiltersService } from './filters_mhc/mhc-filters.service';
import { TCRFiltersService } from './filters_tcr/tcr-filters.service';

export type FiltersServiceEventType = number;

export namespace FiltersServiceEventType {
  export const META: number = 0;
  export const RESET: number = 1;
  export const GET: number = 2;
  export const UPDATE: number = 3;
}

@Injectable()
export class FiltersService implements FilterInterface {
  private _filtersEvents: EventEmitter<FiltersServiceEventType> = new EventEmitter();

  constructor(private tcr: TCRFiltersService, private ag: AGFiltersService,
              private mhc: MHCFiltersService, private meta: MetaFiltersService) {
    this.setDefault();
  }

  public getEvents(): EventEmitter<FiltersServiceEventType> {
    return this._filtersEvents;
  }

  public forceUpdate(): void {
    this._filtersEvents.emit(FiltersServiceEventType.UPDATE);
  }

  public setDefault(): void {
    this.tcr.setDefault();
    this.ag.setDefault();
    this.mhc.setDefault();
    this.meta.setDefault();
    this._filtersEvents.emit(FiltersServiceEventType.RESET);
  }

  public setOptions(options: IFiltersOptions): void {
    const tcrFilterId = this.tcr.getFilterId();
    if (options.hasOwnProperty(tcrFilterId)) {
      this.tcr.setOptions(options[ tcrFilterId ]);
    }

    const agFilterId = this.ag.getFilterId();
    if (options.hasOwnProperty(agFilterId)) {
      this.ag.setOptions(options[ agFilterId ]);
    }

    const mhcFilterId = this.mhc.getFilterId();
    if (options.hasOwnProperty(mhcFilterId)) {
      this.mhc.setOptions(options[ mhcFilterId ]);
    }

    const metaFilterId = this.meta.getFilterId();
    if (options.hasOwnProperty(metaFilterId)) {
      this.meta.setOptions(options[ metaFilterId ]);
    }
    this._filtersEvents.emit(FiltersServiceEventType.META);
  }

  public collectFilters(filters: Filter[], errors: string[]) {
    this.tcr.collectFilters(filters, errors);
    this.ag.collectFilters(filters, errors);
    this.mhc.collectFilters(filters, errors);
    this.meta.collectFilters(filters, errors);
    this._filtersEvents.emit(FiltersServiceEventType.GET);
  }

  public getFilterId(): string {
    return 'main';
  }

  public static unpackFilters(filters: Filter[]): IFilter[] {
    return filters.map((filter: Filter) => filter.unpack());
  }
}

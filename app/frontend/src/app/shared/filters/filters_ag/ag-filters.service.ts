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

import { Injectable } from '@angular/core';
import { Filter, FilterInterface, IFiltersOptions } from '../filters';
import { AGEpitopeFilter, AGOriginFilter } from './ag-filters';
import { SetEntry } from "shared/filters/common/set/set-entry";

@Injectable()
export class AGFiltersService implements FilterInterface {
  public epitope: AGEpitopeFilter;
  public origin: AGOriginFilter;

  constructor() {
    this.epitope = new AGEpitopeFilter();
    this.origin = new AGOriginFilter();
  }

  public setDefault(): void {
    this.epitope.setDefault();
    this.origin.setDefault();
  }

  public setOptions(options: IFiltersOptions): void {
    const epitopeFilterId = this.epitope.getFilterId();
    if (options.hasOwnProperty(epitopeFilterId)) {
      this.epitope.setOptions(options[ epitopeFilterId ]);
    }

    const originFilterId = this.origin.getFilterId();
    if (options.hasOwnProperty(originFilterId)) {
      this.origin.setOptions(options[ originFilterId ]);
    }
  }

  public collectFilters(filters: Filter[], errors: string[]): void {
    this.epitope.collectFilters(filters, errors);
    this.origin.collectFilters(filters, errors);
  }

  public getFilterId(): string {
    return 'ag';
  }

  public isInfectionSelected(infection: string): boolean {
    switch (infection) {
      case 'covid19':
        return this.origin.speciesSelected.findIndex((e) => { return e.value === 'SarsCov' }) !== -1;
      case 'commonflu':
        return this.origin.speciesSelected.findIndex((e) => { return e.value === 'Influenza' }) !== -1;
      default:
        return false;
    }
  }

  public selectInfection(infection: string): void {
    switch (infection) {
      case 'covid19':
        this.switchInfection('covid19', 'SarsCov')
        break;
      case 'commonflu':
        this.switchInfection('commonflu', 'Influenza')
        break;
      default:
    }
  }

  private switchInfection(infection: string, value: string): void {
    if (this.isInfectionSelected(infection)) {
      this.origin.speciesSelected.splice(this.origin.speciesSelected.findIndex((e) => { return e.value === value }), 1)
    } else {
      this.origin.speciesSelected.push(new SetEntry(value, value, false));
    }
  }
}

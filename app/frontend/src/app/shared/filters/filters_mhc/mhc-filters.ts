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

import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FilterType, IFiltersOptions } from '../filters';

export class MHCGeneralFilter implements FilterInterface {
  public mhci: boolean;
  public mhcii: boolean;

  public setDefault(): void {
    this.mhci = true;
    this.mhcii = true;
  }

  public setOptions(_: IFiltersOptions): void {
    return;
  }

  public collectFilters(filters: Filter[], _: string[]): void {
    if (this.mhci === false) {
      filters.push(new Filter('mhc.class', FilterType.EXACT, true, 'MHCI'));
    }
    if (this.mhcii === false) {
      filters.push(new Filter('mhc.class', FilterType.EXACT, true, 'MHCII'));
    }
  }

  public getFilterId(): string {
    return 'general';
  }
}

export class MHCHaplotypeFilter implements FilterInterface {
  public firstChainSelected: SetEntry[] = [];
  public firstChainValues: string[] = [];

  public secondChainSelected: SetEntry[] = [];
  public secondChainValues: string[] = [];

  public setDefault(): void {
    this.firstChainSelected = [];
    this.secondChainSelected = [];
  }

  public setOptions(options: IFiltersOptions): void {
    /* Disable tslint to prevent ClosureCompiler mangling */
    /* tslint:disable:no-string-literal */
    if (options.hasOwnProperty('firstChainValues')) {
      this.firstChainValues = options[ 'firstChainValues' ];
    }
    if (options.hasOwnProperty('secondChainValues')) {
      this.secondChainValues = options[ 'secondChainValues' ];
    }
    /* tslint:enable:no-string-literal */
  }

  public collectFilters(filters: Filter[], _: string[]): void {
    if (this.firstChainSelected.length > 0) {
      filters.push(new Filter('mhc.a', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.firstChainSelected)));
    }
    if (this.secondChainSelected.length > 0) {
      filters.push(new Filter('mhc.b', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.secondChainSelected)));
    }
  }

  public getFilterId(): string {
    return 'haplotype';
  }
}

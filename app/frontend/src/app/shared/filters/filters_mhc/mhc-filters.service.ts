/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Injectable } from '@angular/core';
import { Filter, FilterInterface, IFiltersOptions } from '../filters';
import { MHCGeneralFilter, MHCHaplotypeFilter } from './mhc-filters';

@Injectable()
export class MHCFiltersService implements FilterInterface {
    public general: MHCGeneralFilter;
    public haplotype: MHCHaplotypeFilter;

    constructor() {
        this.general = new MHCGeneralFilter();
        this.haplotype = new MHCHaplotypeFilter();
    }

    public setDefault(): void {
        this.general.setDefault();
        this.haplotype.setDefault();
    }

    public setOptions(options: IFiltersOptions): void {
        const generalFilterId = this.general.getFilterId();
        if (options.hasOwnProperty(generalFilterId)) {
            this.general.setOptions(options[generalFilterId]);
        }

        const haplotypeFilterId = this.haplotype.getFilterId();
        if (options.hasOwnProperty(haplotypeFilterId)) {
            this.haplotype.setOptions(options[haplotypeFilterId]);
        }
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.haplotype.collectFilters(filters, errors);
    }

    public getFilterId(): string {
        return 'mhc';
    }
}

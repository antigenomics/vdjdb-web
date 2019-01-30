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
import { MetaGeneralFilter, MetaReliabilityFilter } from './meta-filters';

@Injectable()
export class MetaFiltersService implements FilterInterface {
    public general: MetaGeneralFilter;
    public reliability: MetaReliabilityFilter;

    constructor() {
        this.general = new MetaGeneralFilter();
        this.reliability = new MetaReliabilityFilter();
    }

    public setDefault(): void {
        this.general.setDefault();
        this.reliability.setDefault();
    }

    public setOptions(options: IFiltersOptions): void {
        const generalFilterId = this.general.getFilterId();
        if (options.hasOwnProperty(generalFilterId)) {
            this.general.setOptions(options[generalFilterId]);
        }

        const reliabilityFilterId = this.reliability.getFilterId();
        if (options.hasOwnProperty(reliabilityFilterId)) {
            this.reliability.setOptions(options[reliabilityFilterId]);
        }
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.reliability.collectFilters(filters, errors);
    }

    public getFilterId(): string {
        return 'meta';
    }
}

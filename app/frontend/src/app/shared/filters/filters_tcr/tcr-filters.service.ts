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
import { TCRcdr3Filter, TCRGeneralFilter, TCRSegmentsFilter } from './tcr-filters';

@Injectable()
export class TCRFiltersService implements FilterInterface {
    public general: TCRGeneralFilter;
    public segments: TCRSegmentsFilter;
    public cdr3: TCRcdr3Filter;

    constructor() {
        this.general = new TCRGeneralFilter();
        this.segments = new TCRSegmentsFilter();
        this.cdr3 = new TCRcdr3Filter();
    }

    public setDefault(): void {
        this.general.setDefault();
        this.segments.setDefault();
        this.cdr3.setDefault();
    }

    public setOptions(options: IFiltersOptions): void {
        const generalFilterId = this.general.getFilterId();
        if (options.hasOwnProperty(generalFilterId)) {
            this.general.setOptions(options[generalFilterId]);
        }

        const segmentsFilterId = this.segments.getFilterId();
        if (options.hasOwnProperty(segmentsFilterId)) {
            this.segments.setOptions(options[segmentsFilterId]);
        }

        const cdr3FilterId = this.cdr3.getFilterId();
        if (options.hasOwnProperty(cdr3FilterId)) {
            this.cdr3.setOptions(options[cdr3FilterId]);
        }
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.segments.collectFilters(filters, errors);
        this.cdr3.collectFilters(filters, errors);
    }

    public getFilterId(): string {
        return 'tcr';
    }
}

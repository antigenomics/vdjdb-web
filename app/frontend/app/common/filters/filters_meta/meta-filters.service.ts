import { Injectable } from '@angular/core';
import { Filter, FilterInterface, FiltersOptions } from '../filters';
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

    public setOptions(options: FiltersOptions): void {
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

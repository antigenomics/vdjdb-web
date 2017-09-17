import { Injectable } from '@angular/core';
import { Filter, FilterInterface, FiltersOptions } from '../filters';
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

    public setOptions(options: FiltersOptions): void {
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

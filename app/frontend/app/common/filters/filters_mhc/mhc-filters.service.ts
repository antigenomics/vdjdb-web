import { Injectable } from '@angular/core';
import { Filter, FilterInterface } from '../filters';
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

    public collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.haplotype.collectFilters(filters, errors);
    }

    public getFilterId(): string {
        return 'mhc';
    }
}

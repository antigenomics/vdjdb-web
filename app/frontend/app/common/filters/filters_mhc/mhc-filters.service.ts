import { Injectable } from "@angular/core";
import { Filter, FilterInterface } from "../filters";
import { MHCGeneralFilter, MHCHaplotypeFilter } from "./mhc-filters";


@Injectable()
export class MHCFiltersService implements FilterInterface {
    public general: MHCGeneralFilter;
    public haplotype: MHCHaplotypeFilter;

    constructor() {
        this.general = new MHCGeneralFilter();
        this.haplotype = new MHCHaplotypeFilter();
    }

    setDefault(): void {
        this.general.setDefault();
        this.haplotype.setDefault();
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.haplotype.collectFilters(filters, errors);
    }

    getFilterId(): string {
        return 'mhc';
    }
}
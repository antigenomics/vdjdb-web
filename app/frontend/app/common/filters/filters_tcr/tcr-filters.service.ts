import { Injectable } from '@angular/core';
import { Filter, FilterInterface } from '../filters';
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

    public collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.segments.collectFilters(filters, errors);
        this.cdr3.collectFilters(filters, errors);
    }

    public getFilterId(): string {
        return 'tcr';
    }
}

import { Injectable } from "@angular/core";
import { Filter, FilterInterface } from "../filters";
import { TCR_CDR3Filter, TCRGeneralFilter, TCRSegmentsFilter } from "./tcr-filters";


@Injectable()
export class TCRFiltersService implements FilterInterface {
    public general: TCRGeneralFilter;
    public segments: TCRSegmentsFilter;
    public cdr3: TCR_CDR3Filter;

    constructor() {
        this.general = new TCRGeneralFilter();
        this.segments = new TCRSegmentsFilter();
        this.cdr3 = new TCR_CDR3Filter();
    }

    setDefault(): void {
        this.general.setDefault();
        this.segments.setDefault();
        this.cdr3.setDefault();
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.segments.collectFilters(filters, errors);
        this.cdr3.collectFilters(filters, errors);
    }

    getFilterId(): string {
        return 'tcr';
    }
}
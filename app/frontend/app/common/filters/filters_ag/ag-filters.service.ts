import { Injectable } from "@angular/core";
import { Filter, FilterInterface } from "../filters";
import { AGEpitopeFilter, AGOriginFilter } from "./ag-filters";


@Injectable()
export class AGFiltersService implements FilterInterface {
    public epitope: AGEpitopeFilter;
    public origin: AGOriginFilter;

    constructor() {
        this.epitope = new AGEpitopeFilter();
        this.origin = new AGOriginFilter();
    }

    setDefault(): void {
        this.epitope.setDefault();
        this.origin.setDefault();
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        this.epitope.collectFilters(filters, errors);
        this.origin.collectFilters(filters, errors);
    }

    getFilterId(): string {
        return 'ag';
    }
}
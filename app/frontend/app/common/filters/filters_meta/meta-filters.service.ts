import { Injectable } from "@angular/core";
import { Filter, FilterInterface } from "../filters";
import { MetaGeneralFilter, MetaReliabilityFilter } from "./meta-filters";


@Injectable()
export class MetaFiltersService implements FilterInterface {
    public general: MetaGeneralFilter;
    public reliability: MetaReliabilityFilter;

    constructor() {
        this.general = new MetaGeneralFilter();
        this.reliability = new MetaReliabilityFilter();
    }

    setDefault(): void {
        this.general.setDefault();
        this.reliability.setDefault();
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        this.general.collectFilters(filters, errors);
        this.reliability.collectFilters(filters, errors);
    }

    getFilterId(): string {
        return 'meta';
    }
}
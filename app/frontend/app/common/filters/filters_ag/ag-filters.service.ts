import { Injectable } from '@angular/core';
import { Filter, FilterInterface, IFiltersOptions } from '../filters';
import { AGEpitopeFilter, AGOriginFilter } from './ag-filters';

@Injectable()
export class AGFiltersService implements FilterInterface {
    public epitope: AGEpitopeFilter;
    public origin: AGOriginFilter;

    constructor() {
        this.epitope = new AGEpitopeFilter();
        this.origin = new AGOriginFilter();
    }

    public setDefault(): void {
        this.epitope.setDefault();
        this.origin.setDefault();
    }

    public setOptions(options: IFiltersOptions): void {
        const epitopeFilterId = this.epitope.getFilterId();
        if (options.hasOwnProperty(epitopeFilterId)) {
            this.epitope.setOptions(options[epitopeFilterId]);
        }

        const originFilterId = this.origin.getFilterId();
        if (options.hasOwnProperty(originFilterId)) {
            this.origin.setOptions(options[originFilterId]);
        }
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        this.epitope.collectFilters(filters, errors);
        this.origin.collectFilters(filters, errors);
    }

    public getFilterId(): string {
        return 'ag';
    }
}

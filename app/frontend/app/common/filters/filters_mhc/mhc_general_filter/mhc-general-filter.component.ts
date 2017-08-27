import { Component } from '@angular/core';
import { FiltersService } from '../../filters.service';
import { Filter, FilterInterface, FilterSavedState, FilterType } from '../../filters';
import { Subject } from 'rxjs/Subject';


@Component({
    selector:    'mhc-general-filter',
    templateUrl: './mhc-general-filter.component.html'
})
export class MHCGeneralFilterComponent extends FilterInterface {
    mhci: boolean;
    mhcii: boolean;

    constructor(filters: FiltersService) {
        super(filters);
    }

    setDefault(): void {
        this.mhci = true;
        this.mhcii = true;
    }

    collectFilters(filtersPool: Subject<Filter[]>): void {
        let filters: Filter[] = [];
        if (this.mhci === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCI'));
        }
        if (this.mhcii === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCII'));
        }
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'mhc.general';
    }

    getSavedState(): FilterSavedState {
        return {
            mhci:  this.mhci,
            mhcii: this.mhcii
        };
    }

    setSavedState(state: FilterSavedState): void {
        this.mhci = state.mhci;
        this.mhcii = state.mhcii;
    }
}
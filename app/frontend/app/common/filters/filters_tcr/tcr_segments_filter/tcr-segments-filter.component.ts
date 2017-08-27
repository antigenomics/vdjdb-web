import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterSavedState, FilterType } from "../../filters";
import { Subject } from "rxjs/Subject";


@Component({
    selector:    'tcr-segments-filter',
    templateUrl: './tcr-segments-filter.component.html'
})
export class TCRSegmentsFilterComponent extends FilterInterface {
    vSegment: string;
    vSegmentValues: string[] = [];

    jSegment: string;
    jSegmentValues: string[] = [];

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefault(): void {
        this.vSegment = '';
        this.jSegment = '';
    }

    collectFilters(filtersPool: Subject<Filter[]>): void {
        let filters: Filter[] = [];
        if (this.vSegment.length !== 0) {
            filters.push(new Filter('v.segm', FilterType.SubstringSet, false, this.vSegment));
        }
        if (this.jSegment.length !== 0) {
            filters.push(new Filter('j.segm', FilterType.SubstringSet, false, this.jSegment));
        }
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'tcr.segments';
    }

    getSavedState(): FilterSavedState {
        return {
            vSegment: this.vSegment,
            jSegment: this.jSegment
        }
    }

    setSavedState(state: FilterSavedState): void {
        this.vSegment = state.vSegment;
        this.jSegment = state.jSegment;
    }
}
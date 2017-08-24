import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


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

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.vSegment.length !== 0) {
            filters.push(new Filter('v.segm', FilterType.SubstringSet, false, this.vSegment));
        }
        if (this.jSegment.length !== 0) {
            filters.push(new Filter('j.segm', FilterType.SubstringSet, false, this.jSegment));
        }
        return filters;
    }
}
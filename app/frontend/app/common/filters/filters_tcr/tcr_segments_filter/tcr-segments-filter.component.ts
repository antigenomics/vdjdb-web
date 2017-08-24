import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


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

    setDefaults(): void {
        this.vSegment = '';
        this.jSegment = '';
    }
}
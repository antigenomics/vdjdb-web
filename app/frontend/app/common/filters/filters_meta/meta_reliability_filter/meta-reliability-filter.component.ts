import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


@Component({
    selector:    'meta-reliability-filter',
    templateUrl: './meta-reliability-filter.component.html'
})
export class MetaReliabilityFilterComponent extends FilterInterface {
    minimalConfidenceScore: number = 0;
    nonCanonical: boolean = false;
    unmapped: boolean = false;

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefaults(): void {
        this.minimalConfidenceScore = 0;
        this.nonCanonical = false;
        this.unmapped = false;
    }
}
import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


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

    setDefault(): void {
        this.minimalConfidenceScore = 0;
        this.nonCanonical = false;
        this.unmapped = false;
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.minimalConfidenceScore > 0) {
            filters.push(new Filter('vdjdb.score', FilterType.Level, false, this.minimalConfidenceScore.toString()));
        }
        if (this.nonCanonical === false) {
            filters.push(new Filter('web.cdr3fix.nc', FilterType.Exact, true, 'yes'));
        }
        if (this.unmapped === false) {
            filters.push(new Filter('web.cdr3fix.unmp', FilterType.Exact, true, 'yes'));
        }
        return filters;
    }
}
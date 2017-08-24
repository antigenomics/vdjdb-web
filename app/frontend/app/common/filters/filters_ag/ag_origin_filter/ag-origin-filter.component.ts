import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


@Component({
    selector:    'ag-origin-filter',
    templateUrl: './ag-origin-filter.component.html'
})
export class AGOriginFilterComponent extends FilterInterface {
    species: string = '';
    speciesAutocomplete: string[] = [];

    genes: string = '';
    genesAutocomplete: string[] = [];

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefault(): void {
        this.species = '';
        this.genes = '';
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.species.length > 0) {
            filters.push(new Filter('antigen.species', FilterType.ExactSet, false, this.species));
        }
        if (this.genes.length > 0) {
            filters.push(new Filter('antigen.gene', FilterType.ExactSet, false, this.genes));
        }
        return filters;
    }
}
import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


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

    setDefaults(): void {
        this.species = '';
        this.genes = '';
    }
}
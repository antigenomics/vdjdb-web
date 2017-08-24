import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


@Component({
    selector:    'mhc-haplotype-filter',
    templateUrl: './mhc-haplotype-filter.component.html'
})
export class MHCHaplotypeFilterComponent extends FilterInterface {
    firstChain: string = '';
    firstChainAutocomplete: string[] = [];

    secondChain: string = '';
    secondChainAutocomplete: string[] = [];

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefaults(): void {
        this.firstChain = '';
        this.secondChain = '';
    }
}
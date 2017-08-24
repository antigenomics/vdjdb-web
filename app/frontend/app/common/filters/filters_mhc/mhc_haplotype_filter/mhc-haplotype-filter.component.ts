import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


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

    setDefault(): void {
        this.firstChain = '';
        this.secondChain = '';
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.firstChain.length > 0) {
            filters.push(new Filter('mhc.a', FilterType.SubstringSet, false, this.firstChain));
        }
        if (this.secondChain.length > 0) {
            filters.push(new Filter('mhc.b', FilterType.SubstringSet, false, this.secondChain));
        }
        return filters;
    }
}
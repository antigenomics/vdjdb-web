import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


@Component({
    selector:    'mhc-general-filter',
    templateUrl: './mhc-general-filter.component.html'
})
export class MHCGeneralFilterComponent extends FilterInterface {
    mhci: boolean = true;
    mhcii: boolean = true;

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefault(): void {
        this.mhci = true;
        this.mhcii = true;
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.mhci === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCI'));
        }
        if (this.mhcii === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCII'));
        }
        return filters;
    }
}
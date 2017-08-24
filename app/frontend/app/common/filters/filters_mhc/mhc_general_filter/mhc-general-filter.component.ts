import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


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

    setDefaults(): void {
        this.mhci = true;
        this.mhcii = true;
    }
}
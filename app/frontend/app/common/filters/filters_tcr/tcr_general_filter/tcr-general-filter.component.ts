import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


@Component({
    selector:    'tcr-general-filter',
    templateUrl: './tcr-general-filter.component.html'
})
export class TCRGeneralFilterComponent extends FilterInterface {
    human: boolean;
    monkey: boolean;
    mouse: boolean;

    tra: boolean;
    trb: boolean;
    pairedOnly: boolean;

    constructor(private filters: FiltersService) {
        super(filters);
    }

    setDefaults(): void {
        this.human = true;
        this.monkey = true;
        this.mouse = true;

        this.tra = false;
        this.trb = true;
        this.pairedOnly = false;
    }
}
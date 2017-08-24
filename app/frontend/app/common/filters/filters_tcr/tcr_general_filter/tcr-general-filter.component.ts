import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


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

    setDefault(): void {
        this.human = true;
        this.monkey = true;
        this.mouse = true;

        this.tra = false;
        this.trb = true;
        this.pairedOnly = false;
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.human === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'HomoSapiens'));
        }
        if (this.monkey === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'MacacaMulatta'));
        }
        if (this.mouse === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'MusMusculus'));
        }
        if (this.tra === false) {
            filters.push(new Filter('gene', FilterType.Exact, true, 'TRA'));
        }
        if (this.trb === false) {
            filters.push(new Filter('gene', FilterType.Exact, true, 'TRB'));
        }
        if (this.pairedOnly === true) {
            filters.push(new Filter('complex.id', FilterType.Exact, true, '0'));
        }
        return filters;
    }
}
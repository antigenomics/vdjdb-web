import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { FilterInterface } from "../../filters";


@Component({
    selector:    'meta-general-filter',
    templateUrl: './meta-general-filter.component.html'
})
export class MetaGeneralFilterComponent extends FilterInterface {
    references: string = '';
    referencesAutocomplete: string[] = [];

    methodSort: boolean = true;
    methodCulture: boolean = true;
    methodOther: boolean = true;

    seqSanger: boolean = true;
    seqAmplicon: boolean = true;
    seqSingleCell: boolean = true;

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefaults(): void {
        this.references = '';
        this.methodSort = true;
        this.methodCulture = true;
        this.methodOther = true;
        this.seqSanger = true;
        this.seqAmplicon = true;
        this.seqSingleCell = true;

    }
}
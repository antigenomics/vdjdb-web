import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { Filter, FilterInterface, FilterType } from "../../filters";


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

    setDefault(): void {
        this.references = '';
        this.methodSort = true;
        this.methodCulture = true;
        this.methodOther = true;
        this.seqSanger = true;
        this.seqAmplicon = true;
        this.seqSingleCell = true;
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.references.length > 0) {
            filters.push(new Filter('reference.id', FilterType.ExactSet, false, this.references));
        }
        if (this.methodSort === false) {
            filters.push(new Filter('web.method', FilterType.Exact, true, 'sort'));
        }
        if (this.methodCulture === false) {
            filters.push(new Filter('web.method', FilterType.Exact, true, 'culture'));
        }
        if (this.methodOther === false) {
            filters.push(new Filter('web.method', FilterType.Exact, true, 'other'));
        }
        if (this.seqSanger === false) {
            filters.push(new Filter('web.method.seq', FilterType.Exact, true, 'sanger'));
        }
        if (this.seqAmplicon === false) {
            filters.push(new Filter('web.method.seq', FilterType.Exact, true, 'amplicon'));
        }
        if (this.seqSingleCell === false) {
            filters.push(new Filter('web.method.seq', FilterType.Exact, true, 'singlecell'));
        }
        return filters;
    }
}
import { Component } from '@angular/core';
import { FiltersService } from "../../filters.service";
import { FilterInterface } from "../../filters";
import { isSequencePatternValid } from "../../../../utils/pattern.util";


@Component({
    selector:    'ag-epitope-filter',
    templateUrl: './ag-epitope-filter.component.html'
})
export class AGEpitopeFilterComponent extends FilterInterface {
    epitopeSequence: string = '';
    epitopeAutocomplete: string[] = [];

    epitopePattern: string = '';
    epitopePatternSubstring: boolean = false;
    epitopePatternValid: boolean = true;

    constructor(public filters: FiltersService) {
        super(filters);
    }

    setDefaults(): void {
        this.epitopeSequence = '';
        this.epitopePattern = '';
        this.epitopePatternSubstring = false;
        this.epitopePatternValid = true;
    }

    checkPattern(newValue: string) : void {
        this.epitopePattern = newValue.toUpperCase();
        this.epitopePatternValid = isSequencePatternValid(this.epitopePattern);
    }

    isPatternValid() : boolean {
        return this.epitopePatternValid;
    }
}
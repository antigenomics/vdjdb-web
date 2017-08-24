import { Component } from '@angular/core';
import { FiltersService, FilterCommand } from "../../filters.service";
import { isSequencePatternValid } from "../../../../utils/pattern.util";
import { FilterInterface } from '../../filters';

@Component({
    selector:    'tcr-cdr3-filter',
    templateUrl: './tcr-cdr3-filter.component.html'
})
export class TCR_CDR3FilterComponent extends FilterInterface {
    pattern: string;
    patternSubstring: boolean;
    patternValid: boolean;

    constructor(private filters: FiltersService) {
        super(filters);
    }

    setDefaults(): void {
        this.pattern = '';
        this.patternSubstring = false;
        this.patternValid = true;
    }

    checkPattern(newValue: string) : void {
        this.pattern = newValue.toUpperCase();
        this.patternValid = isSequencePatternValid(this.pattern);
    }

    isPatternValid() : boolean {
        return this.patternValid;
    }
}
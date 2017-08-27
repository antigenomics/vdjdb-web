import { Component } from '@angular/core';
import { FiltersService } from '../../filters.service';
import { isSequencePatternValid } from '../../../../utils/pattern.util';
import { Filter, FilterInterface, FilterSavedState, FilterType } from '../../filters';
import { Subject } from 'rxjs/Subject';


@Component({
    selector:    'tcr-cdr3-filter',
    templateUrl: './tcr-cdr3-filter.component.html'
})
export class TCR_CDR3FilterComponent extends FilterInterface {
    pattern: string;
    patternSubstring: boolean;
    patternValid: boolean;

    constructor(filters: FiltersService) {
        super(filters);
    }

    setDefault(): void {
        this.pattern = '';
        this.patternSubstring = false;
        this.patternValid = true;
    }

    collectFilters(filtersPool: Subject<Filter[]>): void {
        if (!this.isPatternValid()) {
            filtersPool.error("CDR3 pattern is not valid");
            return;
        }
        let filters: Filter[] = [];
        if (this.pattern.length !== 0) {
            let value = this.pattern;
            if (this.patternSubstring === false) {
                value = '^' + value + '$';
            }
            filters.push(new Filter('cdr3', FilterType.Pattern, false, value.replace(/X/g, ".")));
        }
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'tcr.cdr3';
    }

    getSavedState(): FilterSavedState {
        return {
            pattern:          this.pattern,
            patternSubstring: this.patternSubstring,
            patternValid:     this.patternValid
        };
    }

    setSavedState(state: FilterSavedState): void {
        this.pattern = state.pattern;
        this.patternSubstring = state.patternSubstring;
        this.patternValid = state.patternValid;
    }

    checkPattern(newValue: string): void {
        this.pattern = newValue.toUpperCase();
        this.patternValid = isSequencePatternValid(this.pattern);
    }

    isPatternValid(): boolean {
        return this.patternValid;
    }

}
import { Component } from '@angular/core';
import { FiltersService } from '../../filters.service';
import { Filter, FilterInterface, FilterSavedState, FilterType } from '../../filters';
import { isSequencePatternValid } from '../../../../utils/pattern.util';
import { Subject } from 'rxjs/Subject';
import { DatabaseService } from '../../../../database/database.service';
import { DatabaseMetadata } from '../../../../database/database-metadata';


@Component({
    selector:    'ag-epitope-filter',
    templateUrl: './ag-epitope-filter.component.html'
})
export class AGEpitopeFilterComponent extends FilterInterface {
    epitopeSequence: string;
    epitopeAutocomplete: string[];

    epitopePattern: string;
    epitopePatternSubstring: boolean;
    epitopePatternValid: boolean;

    constructor(filters: FiltersService, database: DatabaseService) {
        super(filters);
        database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.epitopeAutocomplete = metadata.getColumnInfo('antigen.epitope').values;
            }
        })
    }

    setDefault(): void {
        this.epitopeSequence = '';
        this.epitopePattern = '';
        this.epitopePatternSubstring = false;
        this.epitopePatternValid = true;
    }

    collectFilters(filtersPool: Subject<Filter[]>): void {
        if (!this.isPatternValid()) {
            filtersPool.error("Epitope pattern is not valid");
            return;
        }
        let filters: Filter[] = [];
        if (this.epitopeSequence.length > 0) {
            filters.push(new Filter('antigen.epitope', FilterType.ExactSet, false, this.epitopeSequence));
        }
        if (this.epitopePattern.length !== 0) {
            let value = this.epitopePattern;
            if (this.epitopePatternSubstring === false) {
                value = '^' + value + '$';
            }
            filters.push(new Filter('antigen.epitope', FilterType.Pattern, false, value.replace(/X/g, ".")));
        }
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'ag.epitope';
    }

    getSavedState(): FilterSavedState {
        return {
            epitopeSequence:         this.epitopeSequence,
            epitopePattern:          this.epitopePattern,
            epitopePatternSubstring: this.epitopePatternSubstring,
            epitopePatternValid:     this.epitopePatternValid
        };
    }

    setSavedState(state: FilterSavedState): void {
        this.epitopeSequence = state.epitopeSequence;
        this.epitopePattern = state.epitopePattern;
        this.epitopePatternSubstring = state.epitopePatternSubstring;
        this.epitopePatternValid = state.epitopePatternValid;
    }

    checkPattern(newValue: string): void {
        this.epitopePattern = newValue.toUpperCase();
        this.epitopePatternValid = isSequencePatternValid(this.epitopePattern);
    }

    isPatternValid(): boolean {
        return this.epitopePatternValid;
    }
}
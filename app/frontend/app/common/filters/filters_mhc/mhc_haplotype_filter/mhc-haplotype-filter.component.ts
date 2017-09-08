import { Component } from '@angular/core';
import { FiltersService } from '../../filters.service';
import { Filter, FilterInterface, FilterSavedState, FilterType } from '../../filters';
import { Subject } from 'rxjs/Subject';
import { DatabaseService } from '../../../../database/database.service';
import { DatabaseMetadata } from '../../../../database/database-metadata';


@Component({
    selector:    'mhc-haplotype-filter',
    templateUrl: './mhc-haplotype-filter.component.html'
})
export class MHCHaplotypeFilterComponent extends FilterInterface {
    firstChain: string;
    firstChainValues: string[];

    secondChain: string;
    secondChainValues: string[];

    constructor(filters: FiltersService, database: DatabaseService) {
        super(filters);
        database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.firstChainValues = metadata.getColumnInfo('mhc.a').values;
                this.secondChainValues = metadata.getColumnInfo('mhc.b').values;
            }
        });
    }

    setDefault(): void {
        this.firstChain = '';
        this.secondChain = '';
    }

    collectFilters(filtersPool: Subject<Filter[]>): void {
        let filters: Filter[] = [];
        if (this.firstChain.length > 0) {
            filters.push(new Filter('mhc.a', FilterType.SubstringSet, false, this.firstChain));
        }
        if (this.secondChain.length > 0) {
            filters.push(new Filter('mhc.b', FilterType.SubstringSet, false, this.secondChain));
        }
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'mhc.haplotype';
    }

    getSavedState(): FilterSavedState {
        return {
            firstChain:  this.firstChain,
            secondChain: this.secondChain
        };
    }

    setSavedState(state: FilterSavedState): void {
        this.firstChain = state.firstChain;
        this.secondChain = state.secondChain;
    }
}
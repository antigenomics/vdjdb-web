import { Component } from '@angular/core';
import { FiltersService } from '../../filters.service';
import { Filter, FilterInterface, FilterSavedState, FilterType } from '../../filters';
import { Subject } from 'rxjs/Subject';
import { DatabaseService } from '../../../../database/database.service';
import { DatabaseMetadata } from '../../../../database/database-metadata';


@Component({
    selector:    'meta-general-filter',
    templateUrl: './meta-general-filter.component.html'
})
export class MetaGeneralFilterComponent extends FilterInterface {
    references: string;
    referencesAutocomplete: string[];

    methodSort: boolean;
    methodCulture: boolean;
    methodOther: boolean;

    seqSanger: boolean;
    seqAmplicon: boolean;
    seqSingleCell: boolean;

    constructor(filters: FiltersService, database: DatabaseService) {
        super(filters);
        database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.referencesAutocomplete = metadata.getColumnInfo('reference.id').values;
            }
        })

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

    collectFilters(filtersPool: Subject<Filter[]>): void {
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
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'meta.general';
    }

    getSavedState(): FilterSavedState {
        return {
            references:    this.references,
            methodSort:    this.methodSort,
            methodCulture: this.methodCulture,
            methodOther:   this.methodOther,
            seqSanger:     this.seqSanger,
            seqAmplicon:   this.seqAmplicon,
            seqSingleCell: this.seqSingleCell
        };
    }

    setSavedState(state: FilterSavedState): void {
        this.references = state.references;
        this.methodSort = state.methodSort;
        this.methodCulture = state.methodCulture;
        this.methodOther = state.methodOther;
        this.seqSanger = state.seqSanger;
        this.seqAmplicon = state.seqAmplicon;
        this.seqSingleCell = state.seqSingleCell;
    }
}
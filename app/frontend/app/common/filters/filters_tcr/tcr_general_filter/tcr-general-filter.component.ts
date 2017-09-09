import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FiltersService } from '../../filters.service';
import { Filter, FilterInterface, FilterSavedState, FilterType } from '../../filters';
import { Subject } from 'rxjs/Subject';


@Component({
    selector:    'tcr-general-filter',
    templateUrl: './tcr-general-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TCRGeneralFilterComponent extends FilterInterface {
    human: boolean;
    monkey: boolean;
    mouse: boolean;

    tra: boolean;
    trb: boolean;
    pairedOnly: boolean;

    constructor(filters: FiltersService) {
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

    collectFilters(filtersPool: Subject<Filter[]>): void {
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
        filtersPool.next(filters);
    }

    getFilterId(): string {
        return 'tcr.general';
    }

    getSavedState(): FilterSavedState {
        return {
            human:      this.human,
            monkey:     this.monkey,
            mouse:      this.mouse,
            tra:        this.tra,
            trb:        this.trb,
            pairedOnly: this.pairedOnly
        };
    }

    setSavedState(state: FilterSavedState): void {
        this.human = state.human;
        this.monkey = state.monkey;
        this.mouse = state.mouse;
        this.tra = state.tra;
        this.trb = state.trb;
        this.pairedOnly = state.pairedOnly;
    }
}
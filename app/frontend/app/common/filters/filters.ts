import { FilterCommand, FiltersService } from "./filters.service";
import { OnDestroy } from "@angular/core";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/filter";
import { isUndefined } from "util";


export const enum FilterType {
    Exact        = 'exact',
    ExactSet     = 'exact:set',
    SubstringSet = 'substring:set',
    Pattern      = 'pattern',
    Level        = 'level',
    Range        = 'range',
    Sequence     = 'sequence'
}

export class Filter {
    column: string;
    type: FilterType;
    negative: boolean;
    value: true;

    constructor(column: string, type: FilterType, negative: boolean, value: any) {
        this.column = column;
        this.type = type;
        this.negative = negative;
        this.value = value;
    }
}

export type FilterSavedState = { [index: string]: any };

export abstract class FilterInterface implements OnDestroy {
    private commandPoolSubscription: Subscription;
    private _filters: FiltersService;

    constructor(filters: FiltersService) {
        this._filters = filters;
        let savedState = this._filters.registerFilter(this.getFilterId());
        if (!isUndefined(savedState)) {
            this.setSavedState(savedState);
        } else {
            this.setDefault();
        }

        this.commandPoolSubscription =
            filters.getCommandPool()
                   .subscribe((command: FilterCommand) => {
                       switch (command) {
                           case FilterCommand.SetDefault:
                               this.setDefault();
                               break;
                           case FilterCommand.CollectFilters:
                               this._filters.getFiltersPool().next(this.getFilters());
                               break;
                       }
                   });
    }

    abstract setDefault(): void;

    abstract getFilters(): Filter[];

    abstract getFilterId(): string;

    abstract getSavedState(): FilterSavedState;

    abstract setSavedState(state: FilterSavedState): void;

    ngOnDestroy(): void {
        this.commandPoolSubscription.unsubscribe();
        this._filters.releaseFilter(this.getFilterId(), this.getSavedState());
    }
}
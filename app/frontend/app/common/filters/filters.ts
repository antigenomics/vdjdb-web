import { FilterCommand, FiltersService } from "./filters.service";
import { OnDestroy } from "@angular/core";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/filter";


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

export abstract class FilterInterface implements OnDestroy {
    private commandPoolSubscription: Subscription;
    private _filters: FiltersService;

    constructor(filters: FiltersService) {
        this._filters = filters;
        this._filters.registerFilter();
        this.setDefault();

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

    ngOnDestroy(): void {
        this.commandPoolSubscription.unsubscribe();
        this._filters.releaseFilter();
    }
}
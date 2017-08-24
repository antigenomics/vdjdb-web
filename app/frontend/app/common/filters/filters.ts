import { DatabaseMetadata } from "../../database/database-metadata";
import { FilterCommand, FiltersService } from "./filters.service";
import { OnDestroy } from "@angular/core";
import { Subscription } from "rxjs/Subscription";


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
    private setDefaultsSubsciption: Subscription;

    constructor(filters: FiltersService) {
        this.setDefaults();

        this.setDefaultsSubsciption = filters.getCommandPool()
                                             .filter((command: FilterCommand) => {
                                                 return command == FilterCommand.SetDefault;
                                             })
                                             .subscribe((_: FilterCommand) => {
                                                 this.setDefaults();
                                             });
    }

    abstract setDefaults(): void;

    ngOnDestroy(): void {
        this.setDefaultsSubsciption.unsubscribe();
    }
}
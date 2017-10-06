export type FilterType = string;

export namespace FilterType {
    export const Exact: string        = 'exact';
    export const ExactSet: string     = 'exact:set';
    export const SubstringSet: string = 'substring:set';
    export const Pattern: string      = 'pattern';
    export const Level: string        = 'level';
    export const Range: string        = 'range';
    export const Sequence: string     = 'sequence';
}

export class Filter {
    public column: string;
    public filterType: FilterType;
    public negative: boolean;
    public value: string;

    constructor(column: string, filterType: FilterType, negative: boolean, value: string) {
        this.column = column;
        this.filterType = filterType;
        this.negative = negative;
        this.value = value;
    }
}

export type FiltersOptions = any;

export abstract class FilterInterface {
    public abstract setDefault(): void;

    public abstract setOptions(options: FiltersOptions): void;

    public abstract collectFilters(filters: Filter[], errors: string[]): void;

    public abstract getFilterId(): string;
}

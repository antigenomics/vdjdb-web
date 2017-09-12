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
    filterType: FilterType;
    negative: boolean;
    value: string;

    constructor(column: string, filterType: FilterType, negative: boolean, value: string) {
        this.column = column;
        this.filterType = filterType;
        this.negative = negative;
        this.value = value;
    }
}

export abstract class FilterInterface {
    abstract setDefault(): void;

    abstract collectFilters(filters: Filter[], errors: string[]): void;

    abstract getFilterId(): string;
}
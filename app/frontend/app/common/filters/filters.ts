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

export abstract class FilterInterface {
    public abstract setDefault(): void;

    public abstract collectFilters(filters: Filter[], errors: string[]): void;

    public abstract getFilterId(): string;
}

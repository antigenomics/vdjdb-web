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

export interface FilterInterface {
    setDefault(): void;

    isValid(): boolean;

    getErrors(): string[];

    getFilters(): Filter[];
}
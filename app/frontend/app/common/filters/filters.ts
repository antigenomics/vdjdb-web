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

export interface IFiltersOptions {
    [index: string]: any;
}

export class FiltersOptions {
    private _options: IFiltersOptions = {};

    public addOption(keys: string, data: any): void {
        const keySet = keys.split('.');
        let option = this._options;
        for (let i = 0; i < keySet.length - 1; ++i) {
            const key = keySet[i];
            if (option[key] === undefined) {
                option[key] = {};
            }
            option = option[key];
        }
        option[keySet[keySet.length - 1]] = data;
    }

    public getOptions(): IFiltersOptions {
        return this._options;
    }
}

export abstract class FilterInterface {
    public abstract setDefault(): void;

    public abstract setOptions(options: IFiltersOptions): void;

    public abstract collectFilters(filters: Filter[], errors: string[]): void;

    public abstract getFilterId(): string;
}

export type FilterType = string;

export namespace FilterType {
    export const EXACT: string = 'exact';
    export const EXACT_SET: string = 'exact:set';
    export const SUBSTRING_SET: string = 'substring:set';
    export const PATTERN: string = 'pattern';
    export const LEVEL: string = 'level';
    export const RANGE: string = 'range';
    export const SEQUENCE: string = 'sequence';
}

export interface IFilter { [index: string]: any; }

export class Filter {
    private _filter: IFilter = {};

    constructor(column: string, filterType: FilterType, negative: boolean, value: string) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this._filter[ 'column' ] = column;
        this._filter[ 'filterType' ] = filterType;
        this._filter[ 'negative' ] = negative;
        this._filter[ 'value' ] = value;
        /* tslint:enable:no-string-literal */
    }

    public unpack(): IFilter {
        return this._filter;
    }
}

export interface IFiltersOptions {
    [index: string]: any;
}

export class FiltersOptions {
    private _options: IFiltersOptions = {};

    public add(keys: string, data: any): void {
        const keySet = keys.split('.');
        let option = this._options;
        for (let i = 0; i < keySet.length - 1; ++i) {
            const key = keySet[ i ];
            if (option[ key ] === undefined) {
                option[ key ] = {};
            }
            option = option[ key ];
        }
        option[ keySet[ keySet.length - 1 ] ] = data;
    }

    public unpack(): IFiltersOptions {
        return this._options;
    }
}

export abstract class FilterInterface {
    public abstract setDefault(): void;

    public abstract setOptions(options: IFiltersOptions): void;

    public abstract collectFilters(filters: Filter[], errors: string[]): void;

    public abstract getFilterId(): string;
}

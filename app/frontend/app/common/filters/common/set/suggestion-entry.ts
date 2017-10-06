export interface ISuggestionEntry {
    value: string;
    meta: string;
}

export class SuggestionEntry implements ISuggestionEntry {
    public value: string;
    public meta: string;

    constructor(entry: ISuggestionEntry) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this.value = entry['value'];
        this.meta = entry['meta'];
        /* tslint:enable:no-string-literal */
    }
}

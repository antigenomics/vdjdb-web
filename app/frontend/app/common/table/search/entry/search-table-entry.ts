export class SearchTableEntry {
    public column: string;
    public value: string;

    constructor(entry: any) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this.column = entry['column'];
        this.value = entry['value'];
        /* tslint:enable:no-string-literal */
    }
}

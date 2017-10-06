import { SearchTableEntry } from '../entry/search-table-entry';

export class SearchTableRowMetadata {
    public pairedID: string;
    public cdr3vEnd: number;
    public cdr3jStart: number;

    constructor(meta: any) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this.pairedID = meta['pairedID'];
        this.cdr3vEnd = meta['cdr3vEnd'];
        this.cdr3jStart = meta['cdr3jStart'];
        /* tslint:enable:no-string-literal */
    }
}

export class SearchTableRow {
    public entries: SearchTableEntry[];
    public metadata: SearchTableRowMetadata;

    constructor(row: any) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this.entries = row['entries'].map((entry: any) => new SearchTableEntry(entry));
        this.metadata = new SearchTableRowMetadata(row['metadata']);
        /* tslint:enable:no-string-literal */
    }
}

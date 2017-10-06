import { SearchTableEntry } from '../entry/search-table-entry';

export class SearchTableRowMetadata {
    public pairedID: string;
    public cdr3vEnd: number;
    public cdr3jStart: number;

    constructor(meta: any) {
        this.pairedID = meta['pairedID'];
        this.cdr3vEnd = meta['cdr3vEnd'];
        this.cdr3jStart = meta['cdr3jStart'];
    }
}

export class SearchTableRow {
    public entries: SearchTableEntry[];
    public metadata: SearchTableRowMetadata;

    constructor(row: any) {
        this.entries = row['entries'].map((entry: any) => new SearchTableEntry(entry));
        this.metadata = new SearchTableRowMetadata(row['metadata']);
    }
}

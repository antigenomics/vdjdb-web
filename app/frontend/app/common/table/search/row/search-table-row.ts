import { SearchTableEntry } from "../entry/search-table-entry";

export class SearchTableRowMetadata {
    complex: string;
    cdr3vEnd: number;
    cdr3jStart: number;

    constructor(meta: any) {
        this.complex = meta.complex;
        this.cdr3vEnd = meta.cdr3vEnd;
        this.cdr3jStart = meta.cdr3jStart;
    }
}

export class SearchTableRow {
    entries: SearchTableEntry[];
    metadata: SearchTableRowMetadata;

    constructor(row: any) {
        this.entries = row.entries.map((entry: any) => new SearchTableEntry(entry.column, entry.value));
        this.metadata = new SearchTableRowMetadata(row.metadata)
    }
}
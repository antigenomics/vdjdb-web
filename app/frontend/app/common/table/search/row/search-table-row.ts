import { SearchTableEntry } from "../entry/search-table-entry";

export class SearchTableRowMetadata {
    complex: string;

    constructor(complex: string) {
        this.complex = complex;
    }
}

export class SearchTableRow {
    entries: SearchTableEntry[];
    metadata: SearchTableRowMetadata;

    constructor(row: any, ) {
        this.entries = row.entries.map((entry: any) => new SearchTableEntry(entry.column, entry.value))
        this.metadata = new SearchTableRowMetadata(row.metadata)
    }
}
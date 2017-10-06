export class SearchTableEntry {
    public column: string;
    public value: string;

    constructor(entry: any) {
        this.column = entry['column'];
        this.value = entry['value'];
    }
}

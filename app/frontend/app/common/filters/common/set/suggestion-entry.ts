export interface ISuggestionEntry {
    value: string;
    meta: string;
}

export class SuggestionEntry implements ISuggestionEntry {
    public value: string;
    public meta: string;

    constructor(entry: ISuggestionEntry) {
        this.value = entry['value'];
        this.meta = entry['meta'];
    }
}

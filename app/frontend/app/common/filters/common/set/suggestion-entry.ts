export class SuggestionEntry {
    public value: string;
    public meta: string;

    constructor(o: any) {
        this.value = o.value;
        this.meta = o.meta;
    }
}
import { TransformEntry } from "./transform-entry";


export class SearchTableEntry {
    column: string;
    value: string;

    constructor(column: string, value: string) {
        this.column = column;
        this.value = TransformEntry.transform(value, column);
    }
}
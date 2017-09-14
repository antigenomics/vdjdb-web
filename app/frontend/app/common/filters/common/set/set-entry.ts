export class SetEntry {
    value: string = '';
    display: string = '';
    disabled: boolean = false;

    constructor(value: string, display: string, disabled: boolean) {
        this.value = value;
        this.display = display;
        this.disabled = disabled;
    }

    static toString(entries: SetEntry[]): string {
        return entries
            .filter((entry: SetEntry) => { return !entry.disabled; })
            .map((entry: SetEntry) => { return entry.value; })
            .join(',');
    }
}
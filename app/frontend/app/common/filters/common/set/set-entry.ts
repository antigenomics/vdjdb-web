export class SetEntry {
    public value: string = '';
    public display: string = '';
    public disabled: boolean = false;

    constructor(value: string, display: string, disabled: boolean) {
        this.value = value;
        this.display = display;
        this.disabled = disabled;
    }

    public static toString(entries: SetEntry[]): string {
        return entries
            .filter((entry: SetEntry) => !entry.disabled)
            .map((entry: SetEntry) => entry.value)
            .join(',');
    }
}

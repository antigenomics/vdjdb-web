import { ChangeDetectionStrategy, Component } from "@angular/core";


@Component({
    selector: "search-table-entry-original",
    template: '{{ value }}',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryOriginalComponent {
    private _value: string;

    generate(value: string) {
        this._value = value;
    }

    get value() {
        return this._value;
    }
}
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DatabaseColumnInfo } from "../../../../../database/database-metadata";


@Component({
    selector: "search-table-entry-json",
    template: '<i class="help circle icon cursor pointer" [style.color]="color" [popup]="value" [popupHeader]="title"></i>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryJsonComponent {
    private _value: string;
    private _title: string;
    private _color: string;

    generate(title: string, jsonString: string, column: DatabaseColumnInfo): void {
        this._title = title;
        try {
            let json = JSON.parse(jsonString);
            let color = 'black';
            let text = '<div class="ui list">';

            let properties = Object.keys(json).sort();
            properties.forEach((property: string) => {
                if (json[property] !== '') {
                    text += '<div class="item">' + property + ' : ' + json[property] + '</div>';
                }
            });

            //#1a9641 - green
            //#a6d96a - light green
            //#dde927 - yellow
            //#fdae61 - orange
            //#d7191c - red

            if (column.name === 'cdr3fix') {
                if (json['good'] === false) {
                    color = '#d7191c';
                } else if (json['fixNeeded'] === true) {
                    if (json['cdr3'] === json['cdr3_old']) {
                        color = '#dde927';
                    } else {
                        color = '#fdae61';
                    }
                } else {
                    color = '#1a9641';
                }
            }

            this._value = text + '</div>';
            this._color = color;
        } catch (e) {
            this._value = '';
            this._color = 'black';
        }
    }

    get value() {
        return this._value;
    }

    get title() {
        return this._title;
    }

    get color() {
        return this._color;
    }
}
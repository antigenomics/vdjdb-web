/* tslint:disable:max-line-length */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SearchTableRow } from '../../row/search-table-row';

@Component({
    selector: 'search-table-entry-cdr',
    template: `<span style="color:#4daf4a;">{{ vRegion }}</span><span [style.color]="otherRegionColor">{{ otherRegion }}</span><span style="color: #377eb8">{{ jRegion }}</span>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryCdrComponent {
    private _vRegion: string;
    private _otherRegion: string;
    private _otherRegionColor: string;
    private _jRegion: string;

    public generate(input: string, row: SearchTableRow): void {
        const vEnd = row.metadata.cdr3vEnd;
        const jStart = row.metadata.cdr3jStart;

        this._otherRegionColor = 'black';
        if (vEnd > 0 && jStart <= 0) {
            this._vRegion = input.substring(0, vEnd);
            this._otherRegion = input.substring(vEnd, input.length);
        } else if (vEnd <= 0 && jStart > 0) {
            this._jRegion = input.substring(jStart - 1, input.length);
            this._otherRegion = input.substring(0, jStart - 1);
        } else if (vEnd > 0 && jStart > 0 && jStart > vEnd) {
            this._vRegion = input.substring(0, vEnd);
            this._otherRegion = input.substring(vEnd, jStart - 1);
            this._jRegion = input.substring(jStart - 1, input.length);
        } else if (vEnd > 0 && jStart > 0 && jStart <= vEnd) {
            this._vRegion = input.substring(0, jStart - 1);
            this._otherRegionColor = '#ff5050';
            this._otherRegion = input.substring(jStart - 1, vEnd);
            this._jRegion = input.substring(vEnd, input.length);
        }
    }

    get vRegion() {
        return this._vRegion;
    }

    get otherRegion() {
        return this._otherRegion;
    }

    get otherRegionColor() {
        return this._otherRegionColor;
    }

    get jRegion() {
        return this._jRegion;
    }
}
/* tslint:enable:max-line-length */

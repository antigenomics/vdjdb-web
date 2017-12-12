/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, HostListener, ViewChild } from '@angular/core';
import { PopupContentTable } from '../../../../../shared/modals/popup/popup-content-table';
import { PopupDirective } from '../../../../../shared/modals/popup/popup.directive';
import { SampleItem } from '../../../../../shared/sample/sample-item';
import { LoggerService } from '../../../../../utils/logger/logger.service';
import { AnnotationsService } from '../../../annotations.service';
import { IntersectionTableRow } from '../row/intersection-table-row';
import { IntersectionTableRowMatch } from '../row/intersection-table-row-match';
import { IntersectionTableRowMetadata } from '../row/intersection-table-row-metadata';

@Component({
    selector:        'td[intersection-table-entry-details]',
    template:        `<button class="circular ui icon basic tiny button" [popup]="quickView" [loading]="loading"
                        display="table" header="Quick view" position="right" width="700" topShift="-35"
                        shiftStrategy="per-item" footer="Click on the 'arrow' to see the alignments" #popupDirective>
                        <i class="dropdown circle icon cursor pointer"></i>
                      </button>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryDetailsComponent {
    private static readonly _maxMatchesInQuickView: number = 10;

    private _loading: boolean = false;
    private _row: IntersectionTableRow;

    @ViewChild('popupDirective', { read: PopupDirective })
    private _directive: PopupDirective;

    @HostBinding('class.center')
    public classCenterHostBindingProperty: boolean = true;

    @HostBinding('class.aligned')
    public classAlignedHostBindingProperty: boolean = true;

    public quickView: PopupContentTable;

    constructor(private logger: LoggerService, private changeDetector: ChangeDetectorRef,
                private annotationsService: AnnotationsService) {}

    @HostListener('focusin')
    @HostListener('mouseenter')
    public async downloadQuickViewMatches(): Promise<void> {
        if (!this._row.matchesLoaded && !this._loading) {
            this._loading = true;
            const response = await this.annotationsService.matchesQuickView(this._row);
            const matches = response.get('matches').map((m: any) => new IntersectionTableRowMatch(m));
            const count = response.get('count');
            this.logger.debug('QuickView matches loaded', matches);

            this._row.matches = matches;
            this._row.matchesCount = count;
            this._row.matchesLoaded = true;
            this.quickView = this.createTable(matches, count);
            this._loading = false;
            this.changeDetector.detectChanges();
            this._directive.updateView();
        }
    }

    public generate(row: IntersectionTableRow) {
        this._row = row;
        this.quickView = row.matchesLoaded ? this.createTable(this._row.matches, this._row.matchesCount) : new PopupContentTable([], []);
    }

    private createTable(matches: IntersectionTableRowMatch[], count: number): PopupContentTable {
        const cdr3Index: number = 1;
        const epitopeIndex: number = 8;
        const speciesIndex: number = 10;
        const mhcaIndex: number = 5;
        const mhcbIndex: number = 6;
        const headers = [ 'CDR3', 'Epitope', 'Species', 'MHC.A', 'MHC.B' ];
        const rows = matches.slice(0, IntersectionTableEntryDetailsComponent._maxMatchesInQuickView).map((match) => {
            const e = match.row.entries;
            return [ e[cdr3Index], e[epitopeIndex], e[speciesIndex], e[mhcaIndex], e[mhcbIndex] ];
        });

        if (count > IntersectionTableEntryDetailsComponent._maxMatchesInQuickView) {
            rows.push(['....', '....', '....', '....', '....']);
        }

        return new PopupContentTable(headers, rows);
    }

    get loading(): boolean {
        return this._loading;
    }
}

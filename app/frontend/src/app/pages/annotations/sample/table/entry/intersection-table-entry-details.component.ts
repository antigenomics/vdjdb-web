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

import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, HostBinding, HostListener, OnDestroy, ViewChild,
    ViewContainerRef
} from '@angular/core';
import { PopupContentTable } from '../../../../../shared/modals/popup/popup-content-table';
import { PopupDirective } from '../../../../../shared/modals/popup/popup.directive';
import { LoggerService } from '../../../../../utils/logger/logger.service';
import { AnnotationsService } from '../../../annotations.service';
import { IntersectionTableMatchesComponent } from '../matches/intersection-table-matches.component';
import { IntersectionTableRow } from '../row/intersection-table-row';
import { IntersectionTableRowMatch } from '../row/intersection-table-row-match';

@Component({
    selector:        'td[intersection-table-entry-details]',
    template:        `<button class="circular ui icon basic tiny button" [ngClass]="{'teal':popupDisabled}" [popup]="quickView" 
                        [loading]="loading" [disabled]="popupDisabled"
                        display="table" header="Quick view" position="right" width="700" topShift="-35"
                        shiftStrategy="per-item" footer="Click on the 'arrow' to see the alignments" #popupDirective>
                        <i class="dropdown circle icon cursor pointer"></i>
                      </button>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryDetailsComponent implements OnDestroy {
    private static readonly _maxMatchesInQuickView: number = 10;

    private _loading: boolean = false;
    private _row: IntersectionTableRow;

    private _matchesComponent: ComponentRef<IntersectionTableMatchesComponent>;
    private _viewContainer: ViewContainerRef;

    @ViewChild('popupDirective', { read: PopupDirective })
    private _directive: PopupDirective;

    @HostBinding('class.center')
    public classCenterHostBindingProperty: boolean = true;

    @HostBinding('class.aligned')
    public classAlignedHostBindingProperty: boolean = true;

    public quickView: PopupContentTable;

    constructor(private logger: LoggerService, private changeDetector: ChangeDetectorRef,
                private annotationsService: AnnotationsService, private resolver: ComponentFactoryResolver) {}

    @HostListener('focusin')
    @HostListener('mouseenter')
    public async downloadQuickViewMatches(): Promise<void> {
        if (!this._row.matchesLoaded && !this._loading) {
            this._loading = true;
            const response = await this.annotationsService.downloadMatches(this._row);
            const matches = response.get('matches').map((m: any) => new IntersectionTableRowMatch(m));
            const count = response.get('count');
            this.logger.debug('QuickView matches loaded', matches);

            this._row.matches = matches;
            this._row.matchesCount = count;
            this._row.matchesLoaded = true;
            this.quickView = this.createTable(matches, count);
            this._loading = false;
            this.updatePopup();
        }
    }

    @HostListener('click')
    public async showAlignmentMatches(): Promise<void> {
        if (this._row.matchesLoaded && !this._matchesComponent) {
            const matchesComponentResolver = this.resolver.resolveComponentFactory(IntersectionTableMatchesComponent);
            this._matchesComponent = this._viewContainer.createComponent(matchesComponentResolver);
            this._matchesComponent.instance.matches = this._row.matches;
            this.updatePopup();
        } else if (this._matchesComponent) {
            this._matchesComponent.destroy();
            this._matchesComponent = undefined;
        }
    }

    public generate(row: IntersectionTableRow, viewContainer: ViewContainerRef) {
        this._row = row;
        this._viewContainer = viewContainer;
        this.quickView = row.matchesLoaded ? this.createTable(this._row.matches, this._row.matchesCount) : new PopupContentTable([], []);
    }

    public ngOnDestroy(): void {
        if (this._matchesComponent) {
            this._matchesComponent.destroy();
        }
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

    private updatePopup(): void {
        this.changeDetector.detectChanges();
        this._directive.updateView();
    }

    get loading(): boolean {
        return this._loading;
    }

    get popupDisabled(): boolean {
        return this._matchesComponent !== undefined;
    }
}

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
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { PopupContentTable } from 'shared/modals/popup/popup-content-table';
import { PopupDirective } from 'shared/modals/popup/popup.directive';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { LoggerService } from 'utils/logger/logger.service';
import { MatchesTable } from '../matches/matches-table';
import { MatchesTableComponent } from '../matches/matches-table.component';
import { MatchTableRow } from '../matches/row/match-table-row';
import { IntersectionTableRow } from '../row/intersection-table-row';

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
export class IntersectionTableEntryDetailsComponent extends TableEntry implements OnDestroy {
    private static readonly SHOW_MATCHES_GOAL: string = 'annotate-show-matches-goal';
    private static readonly _maxMatchesInQuickView: number = 10;

    private _loading: boolean = false;
    private _row: IntersectionTableRow;

    private _matchesComponent: ComponentRef<MatchesTableComponent>;
    private _hostViewContainer: ViewContainerRef;

    @ViewChild('popupDirective', { read: PopupDirective })
    private _directive: PopupDirective;

    @HostBinding('class.center')
    @HostBinding('class.aligned')
    public classCenterAlignedHostBindingProperty: boolean = true;

    public quickView: PopupContentTable;

    constructor(private logger: LoggerService, private changeDetector: ChangeDetectorRef, private sampleService: SampleService,
                private annotationsService: AnnotationsService, private resolver: ComponentFactoryResolver, private analytics: AnalyticsService) {
        super();
    }

    @HostListener('focusin')
    @HostListener('mouseenter')
    public async downloadQuickViewMatches(): Promise<void> {
        if (!this._row.matchesLoaded && !this._loading) {
            this._loading = true;
            const response = await this.annotationsService.downloadMatches(this._row, this.sampleService.getCurrentSample());
            const matches = response.get('matches').map((m: any) => new MatchTableRow(m));
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
            const matchesComponentResolver = this.resolver.resolveComponentFactory(MatchesTableComponent);
            this._matchesComponent = this._hostViewContainer.createComponent(matchesComponentResolver);

            const table = new MatchesTable();
            table.updateRows(this._row.matches);
            this._matchesComponent.instance.table = table;

            this.analytics.reachGoal(IntersectionTableEntryDetailsComponent.SHOW_MATCHES_GOAL);
        } else if (this._matchesComponent) {
            this._matchesComponent.destroy();
            this._matchesComponent = undefined;
        }
        this.updatePopup(false);
    }

    public create(_entry: string, _column: TableColumn, _columns: TableColumn[], row: IntersectionTableRow,
                  hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
        this._row = row;
        this._hostViewContainer = hostViewContainer;
        this.quickView = row.matchesLoaded ? this.createTable(this._row.matches, this._row.matchesCount) : new PopupContentTable([], []);
    }

    public ngOnDestroy(): void {
        if (this._matchesComponent) {
            this._matchesComponent.destroy();
        }
    }

    private createTable(matches: MatchTableRow[], count: number): PopupContentTable {
        const cdr3Index: number = 1;
        const epitopeIndex: number = 8;
        const speciesIndex: number = 10;
        const mhcaIndex: number = 5;
        const mhcbIndex: number = 6;
        const headers = [ 'CDR3', 'Epitope', 'Species', 'MHC.A', 'MHC.B' ];
        const rows = matches.slice(0, IntersectionTableEntryDetailsComponent._maxMatchesInQuickView).map((match) => {
            const e = match.entries;
            return [ e[ cdr3Index ], e[ epitopeIndex ], e[ speciesIndex ], e[ mhcaIndex ], e[ mhcbIndex ] ];
        });

        if (count > IntersectionTableEntryDetailsComponent._maxMatchesInQuickView) {
            rows.push([ '....', '....', '....', '....', '....' ]);
        }

        return new PopupContentTable(headers, rows);
    }

    private updatePopup(visible?: boolean): void {
        this.changeDetector.detectChanges();
        this._directive.updateView(visible);
    }

    get loading(): boolean {
        return this._loading;
    }

    get popupDisabled(): boolean {
        return this._matchesComponent !== undefined;
    }
}

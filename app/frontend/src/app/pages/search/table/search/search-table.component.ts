/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { TableColumn } from '../../../../shared/table/column/table-column';
import { SearchTableService } from './search-table.service';

@Component({
    selector:    'search-table',
    templateUrl: './search-table.component.html',
    styleUrls:   [ './search-table.component.css' ]
})
export class SearchTableComponent implements OnInit, OnDestroy {
    private _updateEventSubscription: Subscription;

    public columns: TableColumn[];

    constructor(public table: SearchTableService, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._updateEventSubscription = this.table.events.subscribe(() => {
            this.columns = this.table.columns.map((c) => {
                return new TableColumn(c.name, c.title);
            });
            this.changeDetector.detectChanges();
        });
        // this.calculateHeaderFontSize();
    }

    public pageChange(page: number): void {
        this.table.pageChange(page);
    }

    public ngOnDestroy(): void {
        this._updateEventSubscription.unsubscribe();
    }
}

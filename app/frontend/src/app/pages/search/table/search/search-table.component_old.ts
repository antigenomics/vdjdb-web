/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { SearchTableService } from './search-table.service';

@Component({
    selector:        'search-table',
    templateUrl:     './search-table.component_old.html',
    styleUrls:       [ './search-table.component.css' ]
})
export class SearchTableOldComponent implements OnInit, OnDestroy {
    private static _resizeEventWaitTime: number = 200;
    private _resizeEventTimeout: number;
    private _updateEventSubscription: Subscription;

    public headerFontSize: string;

    @ViewChild('pagination')
    public pagination: ElementRef;

    constructor(public table: SearchTableService, private changeDetector: ChangeDetectorRef) {}

    @HostListener('window:resize', ['$event'])
    public onResize() {
        window.clearTimeout(this._resizeEventTimeout);
        this._resizeEventTimeout = window.setTimeout(() => {
            this.calculateHeaderFontSize();
        }, SearchTableOldComponent._resizeEventWaitTime);
    }

    public ngOnInit(): void {
        this._updateEventSubscription = this.table.events.subscribe(() => {
            this.changeDetector.detectChanges();
        });
        this.calculateHeaderFontSize();
    }

    public pageChange(page: number): void {
        this.table.pageChange(page);
    }

    public isSorted(column: string): string[] {
        if (this.table.sortRule.column !== column) {
            return [];
        }
        switch (this.table.sortRule.type) {
            case 'asc':
                return [ 'ascending' ];
            case 'desc':
                return [ 'descending' ];
            default:
                return [];
        }
    }

    public ngOnDestroy(): void {
        this._updateEventSubscription.unsubscribe();
    }

    private calculateHeaderFontSize(): void {
        // const magickA = 0.00015625;
        // const magickB = 0.6;
        const magickA = 0.0003125;
        const magickB = 0.4;
        const headerSize = magickA * window.innerWidth + magickB;
        this.headerFontSize = headerSize + 'em';
        this.changeDetector.detectChanges();
    }
}

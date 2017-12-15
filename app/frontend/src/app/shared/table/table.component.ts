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

import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { TableColumn } from './column/table-column';
import { ExportFormat } from './export/table-export.component';
import { TableRow } from './row/table-row';
import { TableSettings } from './settings/table-settings';
import { Table } from './table';

@Component({
    selector:    'table[table-component]',
    templateUrl: './table.component.html',
    styleUrls:   [ './table.component.css' ]
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy {
    private static _resizeEventWaitTime: number = 200;

    private _resizeEventListener: () => void;
    private _resizeEventTimeout: number;
    private _tableEventsSubscription: Subscription;

    public headerFontSize: string = 'inherit';
    public contentFontSize: string = 'inherit';

    @Input('settings')
    public settings: TableSettings;

    @Input('columns')
    public columns: TableColumn[];

    @Input('table')
    public table: Table<TableRow>;

    @Output('onColumnClick')
    public onColumnClick = new EventEmitter<TableColumn>();

    @Output('onPageChange')
    public onPageChange = new EventEmitter<number>();

    @Output('onPageSizeChange')
    public onPageSizeChange = new EventEmitter<number>();

    @Output('onExport')
    public onExport = new EventEmitter<ExportFormat>();

    constructor(private changeDetector: ChangeDetectorRef, private renderer: Renderer2) {}

    public ngOnInit(): void {
        this._tableEventsSubscription = this.table.events.subscribe(() => {
            this.changeDetector.detectChanges();
        });
    }

    public ngAfterViewInit(): void {
        if (this.settings.size.header.dynamicSizeEnabled || this.settings.size.content.dynamicSizeEnabled) {
            this.updateFontSize();
            this._resizeEventListener = this.renderer.listen('window', 'resize', () => {
                this.onResize();
            });
        }
    }

    public isSorted(column: TableColumn): string {
        return this.table.isSorted(column.name);
    }

    public ngOnDestroy(): void {
        if (this._tableEventsSubscription) {
            this._tableEventsSubscription.unsubscribe();
        }
    }

    private onResize(): void {
        window.clearTimeout(this._resizeEventTimeout);
        this._resizeEventTimeout = window.setTimeout(() => {
            this.updateFontSize();
        }, TableComponent._resizeEventWaitTime);
    }

    private updateFontSize(): void {
        if (this.settings.size.header.dynamicSizeEnabled) {
            this.calculateHeaderFontSize();
        }
        if (this.settings.size.content.dynamicSizeEnabled) {
            this.calculateContentFontSize();
        }
        this.changeDetector.detectChanges();
    }

    private calculateHeaderFontSize(): void {
        const a = this.settings.size.header.dynamicSizeWeightA;
        const b = this.settings.size.header.dynamicSizeWeightB;
        const headerSize = a * window.innerWidth + b;
        this.headerFontSize = headerSize + 'em';
    }

    private calculateContentFontSize(): void {
        const a = this.settings.size.content.dynamicSizeWeightA;
        const b = this.settings.size.content.dynamicSizeWeightB;
        const contentFontSize = a * window.innerWidth + b;
        this.contentFontSize = contentFontSize + 'em';
    }
}

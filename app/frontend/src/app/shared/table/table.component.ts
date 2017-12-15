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

import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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
export class TableComponent implements OnInit, OnDestroy {
    private _tableEventsSubscription: Subscription;

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

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._tableEventsSubscription = this.table.events.subscribe((event) => {
            this.changeDetector.detectChanges();
        });
    }

    public columnClick(column: TableColumn): void {
        this.onColumnClick.emit(column);
    }

    public pageChange(page: number): void {
        this.onPageChange.emit(page);
    }

    public pageSizeChange(pageSize: number): void {
        this.onPageSizeChange.emit(pageSize);
    }

    public export(format: ExportFormat): void {
        this.onExport.emit(format);
    }

    public isSorted(column: TableColumn): string {
        return this.table.isSorted(column.name);
    }

    public ngOnDestroy(): void {
        if (this._tableEventsSubscription) {
            this._tableEventsSubscription.unsubscribe();
        }
    }
}

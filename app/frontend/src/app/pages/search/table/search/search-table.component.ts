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

import { Component, OnInit } from '@angular/core';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/take';
import { TableColumn } from '../../../../shared/table/column/table-column';
import { ExportFormat } from '../../../../shared/table/export/table-export.component';
import { TableSettings } from '../../../../shared/table/settings/table-settings';
import { TableEvent } from '../../../../shared/table/table';
import { SearchTableService } from './search-table.service';

@Component({
    selector:    'search-table',
    templateUrl: './search-table.component.html'
})
export class SearchTableComponent implements OnInit {
    public settings: TableSettings;
    public columns: TableColumn[] = [];

    constructor(public table: SearchTableService) {
        this.settings = new TableSettings({
            classes: {
                columns: 'collapsing center aligned',
                rows:    'center aligned fade element'
            },
            size:    {
                header: {
                    dynamicSizeEnabled: true
                },
                content: {
                    dynamicSizeEnabled: true,
                    dynamicSizeWeightB: 0.6
                }
            }
        });
    }

    public ngOnInit(): void {
        if (!this.table.isInitialized()) {
            this.table.events.filter((event) => event === TableEvent.INITIALIZED).take(1).subscribe(() => {
                this.columns = this.table.columns.map((c) => {
                    return new TableColumn(c.name, c.title, false, false, true, c.comment, 'Click to sort column');
                });
            });
        }
    }

    public async onPageChange(page: number): Promise<void> {
        return this.table.changePage(page);
    }

    public async onPageSizeChange(pageSize: number): Promise<void> {
        return this.table.changePageSize(pageSize);
    }

    public async onColumnClick(column: TableColumn): Promise<void> {
        return this.table.sort(column.name);
    }

    public async onExport(format: ExportFormat): Promise<void> {
        return this.table.exportTable(format);
    }
}

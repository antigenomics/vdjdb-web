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

import { Component, Input } from '@angular/core';
import { SearchTable } from 'pages/search/table/search/search-table';
import { TableColumn } from 'shared/table/column/table-column';
import { ITableConfigurationDescriptor } from 'shared/table/configuration/table-configuration';
import { IExportFormat, IExportOptionFlag } from 'shared/table/export/table-export.component';

@Component({
    selector:    'search-table',
    templateUrl: './search-table.component.html'
})
export class SearchTableComponent {
    public configuration: ITableConfigurationDescriptor = {
        classes: { columns: 'collapsing center aligned', rows: 'center aligned fade element' },
        size:    {
            header:  { dynamicSizeEnabled: true },
            content: { dynamicSizeEnabled: true, dynamicSizeWeightB: 0.6 }
        },
        utils:   {
            export: {
                formats: [ { name: 'tsv', title: 'TSV', icon: 'file text outline' } ],
                options: [ { name: 'paired_export', title: 'Paired gene export', value: true } ]
            }
        }
    };

    @Input('columns')
    public columns: TableColumn[] = [];

    @Input('table')
    public table: SearchTable;

    public async onPageChange(page: number): Promise<void> {
        return this.table.changePage(page);
    }

    public async onPageSizeChange(pageSize: number): Promise<void> {
        return this.table.changePageSize(pageSize);
    }

    public async onColumnClick(column: TableColumn): Promise<void> {
        if (column.sortable) {
            this.table.sort(column.name);
        }
    }

    public async onExport(request: { format: IExportFormat, options: IExportOptionFlag[] }): Promise<void> {
        return this.table.exportTable(request);
    }
}

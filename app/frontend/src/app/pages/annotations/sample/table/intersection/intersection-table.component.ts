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
import { TableColumn } from 'shared/table/column/table-column';
import { ITableConfigurationDescriptor } from 'shared/table/configuration/table-configuration';
import { Configuration } from 'utils/configuration/configuration';
import { IntersectionTable } from './intersection-table';

@Component({
    selector:    'intersection-table',
    templateUrl: './intersection-table.component.html'
})
export class IntersectionTableComponent {
    public configuration: ITableConfigurationDescriptor;

    @Input('table')
    public table: IntersectionTable;

    constructor() {
        this.configuration = {
            classes: {
                columns: 'center aligned',
                rows:    'fade element'
            },
            utils:   {
                disable:    false,
                info:       true,
                export:     { disable: true }
            },
            size:    {
                header: {
                    dynamicSizeEnabled: true,
                    dynamicSizeWeightB: 0.5
                }
            }
        };
    }

    public onPageChange(page: number): void {
        this.table.updatePage(page);
    }

    public onPageSizeChange(pageSize: number): void {
        this.table.updatePageSize(pageSize);
    }

    // noinspection JSMethodCanBeStatic
    public getColumns(): TableColumn[] {
        return [
            new TableColumn('details', 'Details', false, true),
            new TableColumn('found', '# matches'),
            new TableColumn('id', 'Rank'),
            new TableColumn('freq', 'Frequency'),
            new TableColumn('count', 'Count'),
            new TableColumn('cdr3aa', 'CDR3aa'),
            new TableColumn('v', 'V'),
            new TableColumn('j', 'J'),
            new TableColumn('tags', 'Tags', false, true)
        ];
    }
}

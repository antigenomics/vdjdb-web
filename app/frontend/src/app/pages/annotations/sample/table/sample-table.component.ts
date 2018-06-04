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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SampleRouteResolverComponent } from 'pages/annotations/sample/common/sample-route-resolver.component';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { TableColumn } from 'shared/table/column/table-column';
import { ITableConfigurationDescriptor } from 'shared/table/configuration/table-configuration';
import { IExportFormat, IExportOptionFlag } from 'shared/table/export/table-export.component';

@Component({
    selector:        'sample-table',
    templateUrl:     './sample-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleTableComponent extends SampleRouteResolverComponent {
    public configuration: ITableConfigurationDescriptor = {
        classes: {
            columns: 'center aligned',
            rows:    'fade element'
        },
        utils:   {
            disable: false,
            export:  {
                formats: [ { name: 'tsv', title: 'TSV', icon: 'file text outline' } ],
                options: [ { name: 'paired_export', title: 'Paired gene export', value: false } ]
            }
        },
        size:    {
            header: {
                dynamicSizeEnabled: true,
                dynamicSizeWeightB: 0.5
            }
        }
    };

    constructor(sampleService: SampleService, activatedRoute: ActivatedRoute, changeDetector: ChangeDetectorRef) {
        super(activatedRoute.parent.data, activatedRoute.parent.snapshot, changeDetector, sampleService);
    }

    public onPageChange(page: number): void {
        this.sample.table.updatePage(page);
    }

    public onPageSizeChange(pageSize: number): void {
        this.sample.table.updatePageSize(pageSize);
    }

    public onColumnClick(column: TableColumn): void {
        if (column.sortable) {
            this.sample.table.sort(column.name, this.getColumns().findIndex((c) => c.name === column.name));
        }
    }

    public async onExport(request: { format: IExportFormat, options: IExportOptionFlag[] }): Promise<void> {
        return this.sampleService.exportTable(this.sample, request);
    }

    // noinspection JSMethodCanBeStatic
    public getColumns(): TableColumn[] {
        return [
            new TableColumn('details', 'Details', false, false, true),
            new TableColumn('found', '# matches', true, false, false, true, 'Number of unique VDJdb records matched by a given clonotype'),
            new TableColumn('id', 'Rank', true, false, false, true, 'Clonotype rank in the sample'),
            new TableColumn('freq', 'Frequency', true, false, false, true, 'Clonotype frequency in the sample'),
            new TableColumn('count', 'Count', true, false, false, true, 'Clonotype count in the sample'),
            new TableColumn('cdr3aa', 'CDR3', true, false, false, true, 'Amino acid sequence of the CDR3 region'),
            new TableColumn('v', 'V', true, false, false, true, 'Variable segment'),
            new TableColumn('j', 'J', true, false, false, true, 'Joining segment'),
            new TableColumn('tags', 'Tags', false, false, true, true, 'Brief description of HLA/parent species/epitopes matches')
        ];
    }

}

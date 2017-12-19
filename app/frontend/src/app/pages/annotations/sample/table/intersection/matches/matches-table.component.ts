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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TableColumn } from '../../../../../../shared/table/column/table-column';
import { TableSettings } from '../../../../../../shared/table/settings/table-settings';
import { AnnotationsService } from '../../../../annotations.service';
import { MatchesTable } from './matches-table';

@Component({
    selector:        'tr[matches-table]',
    templateUrl:     './matches-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchesTableComponent {
    @Input('table')
    public table: MatchesTable;

    public settings: TableSettings;

    constructor(private annotationsService: AnnotationsService) {
        this.settings = new TableSettings({
            classes: {
                columns: 'collapsing center aligned',
                rows:    'center aligned'
            },
            utils:   {
                disable:    true
            },
            size:    {
                header: {
                    dynamicSizeEnabled: true,
                    dynamicSizeWeightB: 0.25
                },
                content: {
                    dynamicSizeEnabled: true,
                    dynamicSizeWeightB: 0.4
                }
            }
        });
    }

    public getColumns(): TableColumn[] {
        const skip: string[] = [ 'gene', 'cdr3', 'species' ];
        const columns = [ new TableColumn('alignment', 'Alignment', false, true) ];

        return columns.concat(this.annotationsService.getDatabaseMetadata().columns.map((c) => {
            return new TableColumn(c.name, c.title, skip.indexOf(c.name) !== -1, false, true, c.comment, '');
        }));
    }
}
